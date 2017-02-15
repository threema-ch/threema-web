# QR Code Format

The QR code contains the necessary information that the app needs to be able to
connect to the browser. It consists primarily of the permanent public key and
the auth token as required by SaltyRTC. Additionally some configuration flags
are being transmitted.


## Binary Format

The binary format looks like this:

    |VV|O|PPPPPPPPPPPPPPPPPPPPPPPPPPPPPPPP|TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT|SSSSSSSSSSSSSSSSSSSSSSSSSSSSSSSS|NN|HHHHHHHH...|

    - V: Version number (2 bytes, UInt16, big endian)
    - O: Options bitfield (1 byte)
    - P: Initiator permanent public key (32 bytes)
    - T: Auth token (32 bytes)
    - S: Server permanent public key (32 bytes)
    - N: SaltyRTC port (2 bytes, UInt16, big endian)
    - H: SaltyRTC host (n bytes, UTF8 String, no null termination)

If you don't want to specify a permanent key for the server, set all bytes to 0.


## Options Bitfield

The option bitfields encodes true/false flags. Currently there are two
supported flags:

    MSB           LSB
    +---------------+
    |0 0 0 0 0 0 P S|
    +---------------+

    - S: Self-hosted. Set this to 1 if the webclient is self-hosted, or to 0 if
         this is the officially hosted version. This only has an influence on
         displayed error messages for improved usability.
    - P: Whether this session is permanent or not. Set this to 1 if the user
         defined a password.


## Encoding

The binary data is encoded as Base64. The QR code is then generated in
alphanumeric mode.


## Example

The following data:

- Version: 1337
- Permanent: true
- Self hosted: false
- Initiator permanent public key: 0x4242424242424242424242424242424242424242424242424242424242424242
- Auth token: 0x2323232323232323232323232323232323232323232323232323232323232323
- Server permanent public key: 0x1337133713371337133713371337133713371337133713371337133713371337
- Host: saltyrtc.example.org
- Port: 1234

...will result in the following Base64 string:

    BTkCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkJCQkIjIyMjIyMjIyMjIyMjIyMjIyMjIyMj
    IyMjIyMjIyMjIxM3EzcTNxM3EzcTNxM3EzcTNxM3EzcTNxM3EzcTNxM3BNJzYWx0eXJ0Yy5leGFt
    cGxlLm9yZw==
