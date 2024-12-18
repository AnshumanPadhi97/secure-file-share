from functools import wraps
from django.http import JsonResponse
import jwt
from django.conf import settings
from .models import User


def jwt_token_required(view_func):
    @wraps(view_func)
    def wrapped_view(request, *args, **kwargs):
        token = request.COOKIES.get('jwt_token')
        if not token:
            return JsonResponse({'error': 'No token provided'}, status=401)

        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=['HS256'])
            user = User.objects.get(id=payload['user_id'])
            request.user = user
        except jwt.ExpiredSignatureError:
            return JsonResponse({'error': 'Token has expired'}, status=401)
        except (jwt.DecodeError, User.DoesNotExist):
            return JsonResponse({'error': 'Invalid token'}, status=401)

        return view_func(request, *args, **kwargs)

    return wrapped_view
