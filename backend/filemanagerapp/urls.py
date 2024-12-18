from django.urls import path
from .views import deleteUser, updateUser, generate_share_link, access, upload_file, list_files, download_file, delete_file, register_user, login_user, list_users, upload_permissions, list_permission
from .views import login_user, totp_setup, totp_verify

urlpatterns = [
    path('upload/', upload_file, name='upload_file'),
    path('files/<int:user_id>/', list_files, name='list_files'),
    path('download/<int:file_id>/', download_file, name='download_file'),
    path('delete/<int:file_id>/', delete_file, name='delete_file'),
    path('register/', register_user, name='register_user'),
    path('login/', login_user, name='login_user'),
    path('totp/setup/', totp_setup, name='totp_setup'),
    path('totp/verify/', totp_verify, name='totp_verify'),
    path('users/', list_users, name='list_users'),
    path('uploadpermissions/', upload_permissions, name='upload_permissions'),
    path('permissions/<int:file_id>/', list_permission, name='list_permission'),
    path('generate/', generate_share_link, name='generate_share_link'),
    path('access/<str:share_token>/', access, name='access'),
    path('updateUser/', updateUser, name='updateUser'),
    path('deleteUser/<int:userid>/', deleteUser, name='deleteUser')
]
