# Generated by Django 5.1.4 on 2024-12-14 06:55

from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='EncryptedFile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('original_filename', models.CharField(max_length=255)),
                ('stored_filename', models.CharField(max_length=255, unique=True)),
                ('uploaded_at', models.DateTimeField(auto_now_add=True)),
                ('file_size', models.BigIntegerField()),
                ('encryption_iv', models.TextField()),
                ('file_type', models.CharField(blank=True, max_length=100, null=True)),
            ],
            options={
                'db_table': 'encrypted_files',
                'ordering': ['-uploaded_at'],
            },
        ),
    ]
