import struct
from typing import List, Tuple

class DSTWriter:
    """Tajima .DST Embroidery Binary File Serializer."""

    @staticmethod
    def _encode_record(dx: int, dy: int, flags: int = 0) -> bytes:
        """
        Encodes dx, dy (-121 to +121 in 0.1mm units) into Tajima 3-byte record.
        flags: 0 = Normal Stitch, 1 = Jump (0x80), 2 = Stop/Color Change (0x40), 3 = End (0xF3)
        """
        b0, b1, b2 = 0, 0, 0x03
        if flags == 1:
            b2 |= 0x80
        elif flags == 2:
            b2 |= 0x40
        elif flags == 3:
            return bytes([0x00, 0x00, 0xF3])

        def set_x(val: int):
            nonlocal b0, b1, b2
            if val > 40: b2 |= 0x04; val -= 81
            if val < -40: b2 |= 0x08; val += 81
            if val > 13: b1 |= 0x04; val -= 27
            if val < -13: b1 |= 0x08; val += 27
            if val > 4:  b0 |= 0x04; val -= 9
            if val < -4:  b0 |= 0x08; val += 9
            if val > 1:  b1 |= 0x01; val -= 3
            if val < -1:  b1 |= 0x02; val += 3
            if val > 0:  b0 |= 0x01; val -= 1
            if val < 0:  b0 |= 0x02; val += 1

        def set_y(val: int):
            nonlocal b0, b1, b2
            if val > 40: b2 |= 0x20; val -= 81
            if val < -40: b2 |= 0x10; val += 81
            if val > 13: b1 |= 0x20; val -= 27
            if val < -13: b1 |= 0x10; val += 27
            if val > 4:  b0 |= 0x20; val -= 9
            if val < -4:  b0 |= 0x10; val += 9
            if val > 1:  b1 |= 0x80; val -= 3
            if val < -1:  b1 |= 0x40; val += 3
            if val > 0:  b0 |= 0x80; val -= 1
            if val < 0:  b0 |= 0x40; val += 1

        set_x(int(round(dx)))
        set_y(int(round(dy)))
        return bytes([b0, b1, b2])

    @classmethod
    def write_dst(cls, stitches: List[Tuple[float, float, str]], design_name: str = "PXY888") -> bytes:
        """
        stitches: List of (x, y, command) where x,y are in mm, command in ['STITCH', 'JUMP', 'STOP', 'END']
        """
        output = bytearray()
        if not stitches:
            return bytes(512)

        # Convert coordinates to 0.1 mm integer units
        coords = [(int(round(s[0] * 10)), int(round(s[1] * 10)), s[2]) for s in stitches]

        min_x = min(c[0] for c in coords)
        max_x = max(c[0] for c in coords)
        min_y = min(c[1] for c in coords)
        max_y = max(c[1] for c in coords)
        color_changes = sum(1 for c in coords if c[2] == 'STOP')

        # Format standard Tajima 512-byte header
        header = (
            f"LA:{design_name[:16]:<16}\r"
            f"ST:{len(coords):>7}\r"
            f"CO:{color_changes:>3}\r"
            f"+X:{max(0, max_x):>5}\r-X:{abs(min(0, min_x)):>5}\r"
            f"+Y:{max(0, max_y):>5}\r-Y:{abs(min(0, min_y)):>5}\r"
            f"AX:+0\rAY:+0\rMX:+0\rMY:+0\rPD:******\r\x1a"
        )
        header_bytes = header.encode('ascii').ljust(512, b' ')
        output.extend(header_bytes)

        # Encode records relative to previous needle point
        last_x, last_y = 0, 0
        for x, y, cmd in coords:
            dx = x - last_x
            dy = y - last_y

            # Clamp large moves into sequences of jumps (-121 to +121)
            while abs(dx) > 121 or abs(dy) > 121:
                step_x = max(-121, min(121, dx))
                step_y = max(-121, min(121, dy))
                output.extend(cls._encode_record(step_x, step_y, flags=1))
                dx -= step_x
                dy -= step_y
                last_x += step_x
                last_y += step_y

            flag = 0
            if cmd == 'JUMP': flag = 1
            elif cmd == 'STOP': flag = 2
            elif cmd == 'END': flag = 3

            output.extend(cls._encode_record(dx, dy, flags=flag))
            last_x = x
            last_y = y

        output.extend(bytes([0x00, 0x00, 0xF3])) # End of design command
        return bytes(output)
