import uuid
import hashlib
import secrets
from django.utils import timezone
from django.db import models
import os
from django.conf import settings
from django.contrib.auth.hashers import make_password, check_password
import json
import uuid
import secrets
import hashlib
import pyotp


class EncryptedFile(models.Model):
    original_filename = models.CharField(max_length=255)
    stored_filename = models.CharField(max_length=255, unique=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    file_size = models.BigIntegerField()
    encryption_iv = models.TextField()  # Store IV as JSON string
    file_type = models.CharField(max_length=100, blank=True, null=True)
    user_id = models.IntegerField(null=True, blank=True)
    encryption_key = models.TextField(null=True)
    authTag = models.TextField(null=True)

    class Meta:
        app_label = 'filemanagerapp'  # Ensure this matches the app name
        db_table = 'encrypted_files'
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.original_filename

    def delete(self, *args, **kwargs):
        """Override delete to remove physical file"""
        # Remove the actual file from storage
        file_path = os.path.join(
            os.path.join(settings.BASE_DIR, 'uploads'), self.stored_filename
        )
        if os.path.exists(file_path):
            os.remove(file_path)

        # Call parent delete method
        super().delete(*args, **kwargs)


class UserPermissions(models.Model):
    file_id = models.IntegerField(null=True, blank=True)
    file_user_id = models.IntegerField(null=True, blank=True)
    file_assigned_id = models.IntegerField(null=True, blank=True)
    permission_Type = models.CharField(max_length=255, default="view")


class User(models.Model):
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=255)  # user, admin, guest
    email = models.EmailField(unique=True, default="default")
    password = models.CharField(max_length=255, default="default")

    def set_password(self, raw_password):
        self.password = make_password(raw_password)

    def check_password(self, raw_password):
        return check_password(raw_password, self.password)


class ShareableLink(models.Model):

    file = models.ForeignKey('EncryptedFile', on_delete=models.CASCADE)
    share_token = models.CharField(max_length=64, unique=True)
    expires_at = models.DateTimeField()

    def generate_share_token(self):
        token_components = [
            str(uuid.uuid4()),
            secrets.token_hex(16)
        ]
        token_string = ''.join(token_components)
        return hashlib.sha256(token_string.encode()).hexdigest()[:32]

    def save(self, *args, **kwargs):
        if not self.share_token:
            self.share_token = self.generate_share_token()

        if not self.expires_at:
            self.expires_at = timezone.now() + timezone.timedelta(seconds=60)

        super().save(*args, **kwargs)

    def is_valid(self):
        return timezone.now() < self.expires_at

    @classmethod
    def create_share_link(cls, file, expiration_seconds=60):
        return cls.objects.create(
            file=file,
            expires_at=timezone.now() + timezone.timedelta(seconds=expiration_seconds)
        )

    def get_share_url(self):
        return f"{'http://localhost:8000/api'.rstrip('/')}/access/{self.share_token}"


class TOTPDevice(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    secret_key = models.CharField(max_length=32, null=True, blank=True)
    is_verified = models.BooleanField(default=False)

    def generate_totp_secret(self):
        self.secret_key = pyotp.random_base32()
        self.save()
        return self.secret_key

    def verify_totp(self, token):
        if not self.secret_key:
            return False
        totp = pyotp.TOTP(self.secret_key)
        return totp.verify(token, valid_window=1)
