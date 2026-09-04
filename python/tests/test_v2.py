from calendar import c
import unittest
from determinist import generate_password, app
from unittest import TestCase
from typer.testing import CliRunner

class TestGenV2(TestCase):
    def setUp(self):
        self.runner = CliRunner()

    def test_deterministic_output(self):
        self.assertEqual(generate_password(version=2, master_pass="Very-Strong-Passphrase", site_name="github.com")[0], "Vo`Ns\\f3")

    def test_site_changes_output(self):
        self.assertNotEqual(generate_password(version=2, master_pass="Very-Strong-Passphrase", site_name="reddit.com")[0], "Vo`Ns\\f3")

    def test_master_changes_output(self):
        self.assertNotEqual(generate_password(version=2, master_pass="Another-Very-Strong-Passphrase", site_name="github.com")[0], "Vo`Ns\\f3")

    def test_length(self):
        self.assertEqual(len(generate_password(version=2, master_pass="Very-Strong-Passphrase", site_name="github.com", pass_length=12)[0]), 12)

    def test_length_diff(self):
        self.assertNotEqual(generate_password(version=2, master_pass="Very-Strong-Passphrase", site_name="github.com", pass_length=16)[0], generate_password(version=2, master_pass="Very-Strong-Passphrase", site_name="github.com", pass_length=12))

    def test_charset(self):
        self.assertEqual(generate_password(version=2, master_pass="Very-Strong-Passphrase", site_name="github.com", pass_length=16, char_types=["digits", "lowercase"])[0], "ikii50pfdlweu1ru")

    def test_cli_core_match(self):
        core = generate_password(version=2, master_pass="Very-Strong-Passphrase", site_name="github.com", pass_length=12, char_types=["digits", "special", "uppercase"])[0]
        cli = self.runner.invoke(app, ["generate", "-M", "Very-Strong-Passphrase", "-n", "github.com", "-l", "12", "-c", "digits,special,uppercase", "-v" "2"])

        self.assertIn(core, cli.output.strip())
        
if __name__ == "__main__":
    unittest.main()