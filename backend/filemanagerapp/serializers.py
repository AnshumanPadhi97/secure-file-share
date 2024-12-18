from rest_framework import serializers
from .models import User
import re


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'role']


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()
    totp_token = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        try:
            user = User.objects.get(email=data.get('email'))
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials")

        if not user.check_password(data.get('password')):
            raise serializers.ValidationError("Invalid credentials")

        self.validated_user = user
        return data


class TOTPVerifySerializer(serializers.Serializer):
    """Serializer for TOTP token verification"""
    token = serializers.CharField(max_length=6, min_length=6)

    def validate_token(self, value):
        # Validate token is numeric
        if not re.match(r'^\d{6}$', value):
            raise serializers.ValidationError("Token must be 6 digits")
        return value
