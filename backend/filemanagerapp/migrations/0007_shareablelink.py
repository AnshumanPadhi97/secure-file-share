# Generated by Django 5.1.4 on 2024-12-14 11:38

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('filemanagerapp', '0006_encryptedfile_user_id'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ShareableLink',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('share_token', models.CharField(max_length=64, unique=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('expires_at', models.DateTimeField()),
                ('max_downloads', models.IntegerField(default=1)),
                ('current_downloads', models.IntegerField(default=0)),
                ('can_download', models.BooleanField(default=True)),
                ('can_view', models.BooleanField(default=True)),
                ('file', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='filemanagerapp.encryptedfile')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]