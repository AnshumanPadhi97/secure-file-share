from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
import ast
import math


def import_key(exported_key):
    try:
        byte_list = ast.literal_eval(exported_key)
        byte_array = bytes(byte_list)
        return byte_array
    except Exception as error:
        print("Key import error:", error)
        raise


def decrypt_file(encrypted_buffer, iv, key, tag):
    try:
        cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag=tag),
                        backend=default_backend())
        decryptor = cipher.decryptor()
        decrypted_content = decryptor.update(
            encrypted_buffer) + decryptor.finalize()
        return decrypted_content
    except Exception as error:
        print("Decryption error:", error)
        raise


def format_bytes(bytes):
    if bytes == 0:
        return "0 Bytes"

    sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    k = 1024
    i = math.floor(math.log(bytes, k))  # log to base 1024
    return f"{round(bytes / math.pow(k, i), 2)} {sizes[i]}"
