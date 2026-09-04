import unittest
from determinist import generate_password
from unittest import TestCase

class TestGenV1(TestCase):
    def test_deterministic_output(self):
        self.assertEqual(generate_password("Very-Strong-Passphrase", "github.com", version=1)[0], "gZR5(UQQ")

    def test_site_changes_output(self):
        self.assertEqual(generate_password("Very-Strong-Passphrase", "reddit.com", version=1)[0], "LkW7(WnU")

    def test_master_changes_output(self):
        self.assertEqual(generate_password("Another-Very-Strong-Passphrase", "github.com", version=1)[0], "20Ps(XiE")

    def test_length(self):
        self.assertEqual(len(generate_password("Very-Strong-Passphrase", "github.com", version=1, pass_length=12)[0]), 12)

    def test_replace(self):
        self.assertEqual(generate_password("Very-Strong-Passphrase", "github.com", version=1, spec_mode="replace", char_map={"g": "{", "q": ".", "r": "="})[0], "V{Z=5U..")

    def test_frequency(self):
        self.assertEqual(generate_password("Very-Strong-Passphrase", "github.com", version=1, spec_freq=2, pass_length=16)[0], "wZ\"LV$gZ&R5(UQ*Q")
        
if __name__ == "__main__":
    unittest.main()