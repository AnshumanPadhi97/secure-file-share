# Generated by Django 5.1.4 on 2024-12-14 08:23

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('filemanagerapp', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserPermissions',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('admin', models.BooleanField(default=False)),
                ('user', models.BooleanField(default=False)),
                ('guest', models.BooleanField(default=False)),
                ('file_id', models.IntegerField(blank=True, null=True)),
            ],
        ),
    ]
