import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brsr_fields import reporting_year

L = 'Financial year for which reporting is being done   '
for value, want in [
    ('01.01.2025 - 31.12.2025', 'CY2025'),  # Elantas Beck India
    ('01/01/2024 to 31/12/2024', 'CY2024'),
    ('01-01-2025 – 31-12-2025', 'CY2025'),
    ('01.04.2025 - 31.03.2026', '2025-26'),
    ('1/4/2024 to 31/3/2025', '2024-25'),
    ('01-04-2025 to 31-03-2026', '2025-26'),
    ('January 1, 2025 to December 31, 2025', 'CY2025'),
    ('April 1, 2025 to March 31, 2026', '2025-26'),
    ('2025-26', '2025-26'),
]:
    got = reporting_year(L + value + '\n')
    assert got == want, (value, got, want)
print('ok')
