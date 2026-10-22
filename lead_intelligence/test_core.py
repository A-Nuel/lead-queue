import unittest
from unittest.mock import patch
from engine import safe_url
from industry import rank
from llm import analyze

class CoreTests(unittest.TestCase):
    def test_private_hosts(self):
        for url in ('http://127.0.0.1', 'http://localhost', 'file:///etc/passwd'):
            with self.assertRaises(ValueError): safe_url(url)
    def test_rank(self):
        result = rank()
        self.assertTrue(result)
        self.assertGreaterEqual(result[0]['score'], result[-1]['score'])
    def test_no_key_fallback(self):
        with patch.dict('os.environ', {'ZAI_API_KEY': ''}):
            self.assertEqual(analyze('Sample', {'evidence': []}, 'zai')['provider'], 'rules')

if __name__ == '__main__': unittest.main()
