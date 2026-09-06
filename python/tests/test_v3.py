import unittest
from determinist import generate_password, app
from unittest import TestCase
from typer.testing import CliRunner

class TestGenV3(TestCase):
    def setUp(self):
        self.runner = CliRunner()

    def test_deterministic_output(self):
        self.assertEqual(generate_password(version=3, master_pass="Very-Strong-Passphrase", site_name="github.com")[0], "tG<KP3''")

    def test_site_changes_output(self):
        self.assertNotEqual(generate_password(version=3, master_pass="Very-Strong-Passphrase", site_name="reddit.com")[0], "tG<KP3''")

    def test_master_changes_output(self):
        self.assertNotEqual(generate_password(version=3, master_pass="Another-Very-Strong-Passphrase", site_name="github.com")[0], "tG<KP3''")

    def test_length(self):
        self.assertEqual(len(generate_password(version=3, master_pass="Very-Strong-Passphrase", site_name="github.com", pass_length=12)[0]), 12)

    def test_length_diff(self):
        self.assertNotEqual(generate_password(version=3, master_pass="Very-Strong-Passphrase", site_name="github.com", pass_length=16)[0], generate_password(version=3, master_pass="Very-Strong-Passphrase", site_name="github.com", pass_length=12)[0])

    def test_charset(self):
        self.assertEqual(generate_password(version=3, master_pass="Very-Strong-Passphrase", site_name="github.com", pass_length=16, char_types_and_freq={"digits": 1, "lowercase": 1, "uppercase": 0, "special": 0})[0], "pfytf19oeg9he7ji")

    def test_differentiator(self):
        self.assertNotEqual(generate_password(version=3, master_pass="Very-Strong-Passphrase", site_name="github.com", pass_length=16, char_types_and_freq={"digits": 3, "lowercase": 3, "uppercase": 2, "special": 4})[0], generate_password(version=3, master_pass="Very-Strong-Passphrase", site_name="github.com", pass_length=16, char_types_and_freq={"digits": 3, "lowercase": 3, "uppercase": 2, "special": 4}, differentiator="account-1")[0])
        
if __name__ == "__main__":
    unittest.main()