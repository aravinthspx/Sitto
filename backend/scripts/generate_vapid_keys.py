"""Generate a VAPID key pair for Web Push.

Run once per environment and paste the output into backend/.env:

    python scripts/generate_vapid_keys.py

Never commit the private key. Rotating keys invalidates every existing
browser subscription (users just tap "Enable" again).
"""
import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


key = ec.generate_private_key(ec.SECP256R1())
private_raw = key.private_numbers().private_value.to_bytes(32, "big")
public_raw = key.public_key().public_bytes(
    serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
)

print(f"VAPID_PUBLIC_KEY={b64url(public_raw)}")
print(f"VAPID_PRIVATE_KEY={b64url(private_raw)}")
