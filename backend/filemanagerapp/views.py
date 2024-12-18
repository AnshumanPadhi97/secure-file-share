import os
import uuid
import json
from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from .models import TOTPDevice, EncryptedFile, UserPermissions, User, ShareableLink
from django.db.models import Q
import base64
from filemanagerapp.Util import decrypt_file, import_key, format_bytes
import pyotp
import qrcode
import io
import jwt
from datetime import datetime, timedelta, timezone
from django.conf import settings
from .decorators import jwt_token_required

# Ensure uploads directory exists
UPLOAD_ROOT = os.path.join(settings.BASE_DIR, 'uploads')
os.makedirs(UPLOAD_ROOT, exist_ok=True)
os.chmod(UPLOAD_ROOT, 0o755)


class EncryptedFileStorage(FileSystemStorage):
    def __init__(self, location=UPLOAD_ROOT, *args, **kwargs):
        super().__init__(location=location, *args, **kwargs)


def get_file_type(filename):
    """Determine file type based on extension"""
    ext = os.path.splitext(filename)[1].lower()
    type_map = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.txt': 'text/plain',
        '.zip': 'application/zip',
    }
    return type_map.get(ext, 'application/octet-stream')


@csrf_exempt
@jwt_token_required
def upload_file(request):
    """Handle encrypted file upload"""
    if request.method == 'POST':
        try:
            user_id = request.POST.get('user_id')

            if User.objects.get(id=user_id).role == "guest":
                return JsonResponse({'error': 'Not allowed to upload'})

            # Get uploaded file
            uploaded_file = request.FILES.get('file')

            if not uploaded_file:
                return JsonResponse({'error': 'No file uploaded'}, status=400)

            # Get encryption details
            encryption_iv = request.POST.get('iv')
            encryption_key = request.POST.get('key')
            authTag = request.POST.get('authTag')

            if not encryption_iv or not encryption_key:
                return JsonResponse({'error': 'Encryption details missing'}, status=400)

            # Generate unique filename
            unique_filename = f"{uuid.uuid4()}_{uploaded_file.name}"

            # Determine file type
            file_type = get_file_type(uploaded_file.name)

            # Save encrypted file to specific upload directory
            file_path = os.path.join(UPLOAD_ROOT, unique_filename)
            with open(file_path, 'wb') as destination:
                for chunk in uploaded_file.chunks():
                    destination.write(chunk)

            # Create database record
            encrypted_file = EncryptedFile.objects.create(
                original_filename=uploaded_file.name,
                stored_filename=unique_filename,
                file_size=uploaded_file.size,
                encryption_iv=encryption_iv,
                file_type=file_type,
                user_id=int(user_id),
                encryption_key=encryption_key,
                authTag=authTag
            )

            return JsonResponse({
                'message': 'Encrypted file uploaded successfully',
                'filename': uploaded_file.name,
                'file_id': encrypted_file.id,
                'file_type': file_type
            }, status=200)

        except Exception as e:
            print(e)
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@jwt_token_required
def list_files(request, user_id):
    """List all uploaded files along with those from UserPermissions"""
    try:
        user_files = EncryptedFile.objects.filter(
            Q(user_id=int(user_id)) | Q(id__in=UserPermissions.objects.filter(
                file_assigned_id=int(user_id)).values('file_id'))
        ).distinct()

        return JsonResponse({
            'files': [
                {
                    'id': file.id,
                    'filename': file.original_filename,
                    'uploaded_at': file.uploaded_at.isoformat(),
                    'size': file.file_size,
                    'file_type': file.file_type,
                    'user_id': file.user_id
                } for file in user_files
            ]
        }, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@jwt_token_required
def download_file(request, file_id):
    """Download an encrypted file"""
    try:
        # Retrieve file metadata
        db_file = EncryptedFile.objects.get(id=file_id)

        # Full path to encrypted file
        encrypted_path = os.path.join(UPLOAD_ROOT, db_file.stored_filename)

        # Check if file exists
        if not os.path.exists(encrypted_path):
            return JsonResponse({'error': 'File not found on server'}, status=404)

        # Open file and prepare response
        file = open(encrypted_path, 'rb')
        response = FileResponse(
            file,
            as_attachment=True,
            filename=db_file.original_filename,
            content_type=db_file.file_type
        )

        # Add IV to response headers for client-side decryption
        response['X-Encryption-IV'] = db_file.encryption_iv
        response['X-Original-Filename'] = db_file.original_filename
        response['X-Encryption-key'] = db_file.encryption_key
        response['X-authTag'] = db_file.authTag
        response['Access-Control-Expose-Headers'] = 'x-encryption-iv, x-original-filename,x-encryption-key,x-authTag'

        return response

    except EncryptedFile.DoesNotExist:
        return JsonResponse({'error': 'File record not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@jwt_token_required
def delete_file(request, file_id):
    """Delete a specific encrypted file"""
    if request.method == 'DELETE':
        try:
            # Find and delete the file record
            file_record = EncryptedFile.objects.get(id=file_id)
            file_record.delete()  # This will also remove the physical file

            permissions_to_delete = UserPermissions.objects.filter(
                file_id=file_id)
            permissions_to_delete.delete()

            return JsonResponse({
                'message': 'File deleted successfully',
                'filename': file_record.original_filename
            })

        except EncryptedFile.DoesNotExist:
            return JsonResponse({'error': 'File not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
@jwt_token_required
def upload_permissions(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            file_id = int(data.get('fileId'))
            permissions = data.get('permissions')

            permission_to_delete = UserPermissions.objects.filter(
                file_id=file_id)
            permission_to_delete.delete()

            file = EncryptedFile.objects.get(id=file_id)

            for permission in permissions:
                assigned_user_id = permission.get('userId')
                permission_type = permission.get('accessType')

                UserPermissions.objects.create(
                    file_id=file_id,
                    file_user_id=int(file.user_id),
                    file_assigned_id=int(assigned_user_id),
                    permission_Type=permission_type
                )

            # Return success message
            return JsonResponse({
                'message': 'Permissions updated successfully',
                'file_id': file_id,
                'permissions': permissions
            }, status=200)

        except json.JSONDecodeError:
            # Handle the case where the JSON is malformed
            return JsonResponse({'error': 'Invalid JSON format in request body'}, status=400)

        except Exception as e:
            # Log the error for debugging
            print(f"Error occurred: {str(e)}")
            return JsonResponse({'error': f"Internal Server Error: {str(e)}"}, status=500)

    # Handle cases where the method is not POST
    return JsonResponse({'error': 'Method not allowed'}, status=405)


@csrf_exempt
def register_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            existing_user = User.objects.filter(
                email=data.get('email')).first()
            if existing_user:
                return JsonResponse({'error': 'User already exists. Please login'}, status=400)

            new_user = User(
                name=data.get('name'),
                email=data.get('email'),
                role=data.get('role', 'admin')
            )
            new_user.set_password(data.get('password'))
            new_user.save()

            return JsonResponse({
                'message': 'Registration & Login successful',
                'user_id': new_user.id,
                'name': new_user.name,
                'email': new_user.email,
                'role': new_user.role
            }, status=200)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


@csrf_exempt
def login_user_old(request):
    """
    User login endpoint
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            user = User.objects.filter(email=data.get('email')).first()

            if user and user.check_password(data.get('password')):
                return JsonResponse({
                    'message': 'Login successful',
                    'user_id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'role': user.role
                })
            else:
                return JsonResponse({'error': 'Invalid credentials'}, status=401)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


@csrf_exempt
def login_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user = User.objects.filter(email=data.get('email')).first()
            if user and user.check_password(data.get('password')):
                try:
                    totp_device = TOTPDevice.objects.get(
                        user=user, is_verified=True)

                    totp_token = data.get('totp_token')
                    if not totp_token:
                        return JsonResponse({
                            'requires_2fa': True,
                            'message': 'Two-factor authentication required'
                        }, status=206)

                    if not totp_device.verify_totp(totp_token):
                        return JsonResponse({'error': 'Invalid 2FA token'}, status=401)

                except TOTPDevice.DoesNotExist:
                    # No 2FA set up, proceed with normal login
                    pass

                # Generate JWT token
                token = generate_jwt_token(user)

                response = JsonResponse({
                    'message': 'Login successful',
                    'user_id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'role': user.role,
                })

                # Set the JWT token as a secure HTTP-only cookie
                response.set_cookie(
                    'jwt_token',
                    token,
                    httponly=True,
                    secure=True,
                    samesite='Lax',
                    max_age=24 * 60 * 60  # 1 day
                )

                return response
            else:
                return JsonResponse({'error': 'Invalid credentials'}, status=401)

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


@csrf_exempt
@jwt_token_required
def list_users(request):
    try:
        users = User.objects.all()
        return JsonResponse({
            'users': [
                {
                    'id': user.id,
                    'name': user.name,
                    'email': user.email,
                    'role': user.role
                } for user in users
            ]
        }, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@jwt_token_required
def list_permission(request, file_id):
    try:
        permissions = UserPermissions.objects.filter(file_id=file_id)
        return JsonResponse({
            'permissions': [
                {
                    'userId': per.file_assigned_id,
                    'accessType': per.permission_Type
                } for per in permissions
            ]
        }, status=200)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@jwt_token_required
def generate_share_link(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)

            file_id = data.get('file_id')
            expiration = data.get('expiration')

            file = EncryptedFile.objects.get(id=file_id)

            share_link = ShareableLink.create_share_link(
                file=file,
                expiration_seconds=expiration
            )

            return JsonResponse({
                'success': True,
                'share_link': share_link.get_share_url(),
                'expires_at': share_link.expires_at
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


@csrf_exempt
def access(request, share_token):
    try:
        share_link = ShareableLink.objects.get(share_token=share_token)

        if not share_link.is_valid():
            return JsonResponse({'error': 'Link has expired'}, status=403)

        file = EncryptedFile.objects.get(id=share_link.file.id)
        iv = import_key(file.encryption_iv)
        key = import_key(file.encryption_key)
        tag = import_key(file.authTag)

        encrypted_path = os.path.join(UPLOAD_ROOT, file.stored_filename)

        if not os.path.exists(encrypted_path):
            return JsonResponse({'error': 'File not found on server'}, status=404)

        with open(encrypted_path, 'rb') as f:
            encrypted_data = f.read()

        decrypted_data = decrypt_file(encrypted_data, iv, key, tag)

        return JsonResponse({
            'filename': file.original_filename,
            'file_type': file.file_type,
            'file_size': format_bytes(file.file_size),
            'file_content': base64.b64encode(decrypted_data).decode('utf-8')
        })

    except ShareableLink.DoesNotExist:
        return JsonResponse({'error': 'Invalid share link'}, status=404)


@csrf_exempt
@jwt_token_required
def updateUser(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            userid = int(data.get('userid'))
            role = data.get('role', 'user')
            existing_user = User.objects.get(id=int(userid))
            existing_user.role = role
            existing_user.save()
            return JsonResponse({'message': 'User role updated successfully'}, status=200)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


@csrf_exempt
@jwt_token_required
def deleteUser(request, userid):
    if request.method == 'DELETE':
        try:
            user_to_delete = User.objects.get(id=userid)
            user_to_delete.delete()
            return JsonResponse({'message': 'User deleted successfully'}, status=200)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


@csrf_exempt
def totp_setup(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            user = User.objects.get(id=user_id)
            totp_device, created = TOTPDevice.objects.get_or_create(user=user)
            if not totp_device.secret_key:
                secret = totp_device.generate_totp_secret()
            else:
                secret = totp_device.secret_key
            totp = pyotp.TOTP(secret)
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(totp.provisioning_uri(
                name=user.email,
                issuer_name='filemanagerapp'
            ))
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")
            buffered = io.BytesIO()
            img.save(buffered, format="PNG")
            qr_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
            return JsonResponse({
                'secret': secret,
                'qr_code': qr_base64
            })
        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


@csrf_exempt
def totp_verify(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            user_id = data.get('user_id')
            token = data.get('token')

            # Validate input
            if not user_id or not token:
                return JsonResponse({'error': 'User ID and token are required'}, status=400)

            # Validate token format
            if not token.isdigit() or len(token) != 6:
                return JsonResponse({'error': 'Token must be a 6-digit number'}, status=400)

            user = User.objects.get(id=user_id)
            totp_device = TOTPDevice.objects.get(user=user)

            print(
                f"TOTP Verification - User: {user.email}, Secret Key: {totp_device.secret_key}")

            if totp_device.verify_totp(token):
                totp_device.is_verified = True
                totp_device.save()
                return JsonResponse({'message': '2FA successfully enabled'})
            else:
                totp = pyotp.TOTP(totp_device.secret_key)
                current_token = totp.now()
                print(f"Current Valid Token: {current_token}")
                print(f"Provided Token: {token}")
                return JsonResponse({'error': 'Invalid or expired token. Please try again.'}, status=400)

        except User.DoesNotExist:
            return JsonResponse({'error': 'User not found'}, status=404)
        except TOTPDevice.DoesNotExist:
            return JsonResponse({'error': 'TOTP not set up for this user'}, status=400)
        except Exception as e:
            print(f"TOTP Verification Error: {str(e)}")
            return JsonResponse({'error': f'Verification failed: {str(e)}'}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)


def generate_jwt_token(user):
    payload = {
        'user_id': user.id,
        'exp': datetime.now(timezone.utc) + timedelta(days=1),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
