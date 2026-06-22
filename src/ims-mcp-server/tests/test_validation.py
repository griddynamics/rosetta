"""Tests for validation module, specifically normalize_tags JSON decoding and normalize_format."""

from __future__ import annotations

import pytest

from ims_mcp.tools.validation import normalize_tags, normalize_format


class TestNormalizeTags:
    """Test normalize_tags function with various inputs including JSON-encoded arrays."""

    def test_native_list_valid(self):
        """Native Python list should work as before."""
        tags, err = normalize_tags(["tag1", "tag2"])
        assert err is None
        assert tags == ["tag1", "tag2"]

    def test_native_list_with_whitespace(self):
        """Native list with whitespace should be trimmed."""
        tags, err = normalize_tags([" tag1 ", "  tag2  "])
        assert err is None
        assert tags == ["tag1", "tag2"]

    def test_native_list_deduplication(self):
        """Duplicate tags should be deduplicated (case-insensitive)."""
        tags, err = normalize_tags(["tag1", "TAG1", "tag2"])
        assert err is None
        assert tags == ["tag1", "tag2"]

    def test_json_encoded_array(self):
        """JSON-encoded array string should be decoded."""
        tags, err = normalize_tags('["tag1", "tag2"]')
        assert err is None
        assert tags == ["tag1", "tag2"]

    def test_json_encoded_array_with_whitespace(self):
        """JSON-encoded array with leading/trailing whitespace should work."""
        tags, err = normalize_tags('  ["tag1", "tag2"]  ')
        assert err is None
        assert tags == ["tag1", "tag2"]

    def test_json_encoded_single_tag(self):
        """JSON-encoded array with single tag should work."""
        tags, err = normalize_tags('["references/pa-schemas.md"]')
        assert err is None
        assert tags == ["references/pa-schemas.md"]

    def test_json_encoded_string_not_array(self):
        """JSON-encoded string (not array) should return error."""
        tags, err = normalize_tags('"tag"')
        assert tags is None
        assert err == "Error: tags must be a list of strings, got JSON-encoded str"

    def test_json_encoded_number_not_array(self):
        """JSON-encoded number (not array) should return plain string error.
        
        Note: Numbers don't start with [ or " so they're treated as plain strings.
        This is acceptable since tags should be arrays.
        """
        tags, err = normalize_tags('42')
        assert tags is None
        assert err == "Error: tags must be a list of strings, not a plain string"

    def test_json_encoded_object_not_array(self):
        """JSON-encoded object (not array) should return plain string error.
        
        Note: Objects start with { not [ or " so they're treated as plain strings.
        This is acceptable since tags should be arrays.
        """
        tags, err = normalize_tags('{"key": "value"}')
        assert tags is None
        assert err == "Error: tags must be a list of strings, not a plain string"

    def test_plain_string_no_json(self):
        """Plain string (not JSON) should return error."""
        tags, err = normalize_tags("tag1")
        assert tags is None
        assert err == "Error: tags must be a list of strings, not a plain string"

    def test_malformed_json(self):
        """Malformed JSON should return error."""
        tags, err = normalize_tags('["tag1"')
        assert tags is None
        assert err == "Error: tags must be a valid JSON array or a list of strings"

    def test_none_not_required(self):
        """None should return None when not required."""
        tags, err = normalize_tags(None, required=False)
        assert tags is None
        assert err is None

    def test_none_required(self):
        """None should return error when required."""
        tags, err = normalize_tags(None, required=True)
        assert tags is None
        assert err == "Error: tags must contain at least one tag"

    def test_empty_list_not_required(self):
        """Empty list should return None when not required."""
        tags, err = normalize_tags([], required=False)
        assert tags is None
        assert err is None

    def test_empty_list_required(self):
        """Empty list should return error when required."""
        tags, err = normalize_tags([], required=True)
        assert tags is None
        assert err == "Error: tags must contain at least one tag"

    def test_json_empty_array_not_required(self):
        """JSON-encoded empty array should return None when not required."""
        tags, err = normalize_tags('[]', required=False)
        assert tags is None
        assert err is None

    def test_json_empty_array_required(self):
        """JSON-encoded empty array should return error when required."""
        tags, err = normalize_tags('[]', required=True)
        assert tags is None
        assert err == "Error: tags must contain at least one tag"

    def test_custom_field_name(self):
        """Custom field name should appear in error messages."""
        tags, err = normalize_tags("invalid", field="custom_tags")
        assert tags is None
        assert "custom_tags" in err

    def test_max_tags_limit(self):
        """Too many tags should return error."""
        many_tags = [f"tag{i}" for i in range(101)]
        tags, err = normalize_tags(many_tags)
        assert tags is None
        assert "at most" in err

    def test_json_max_tags_limit(self):
        """JSON-encoded array with too many tags should return error."""
        import json
        many_tags = [f"tag{i}" for i in range(101)]
        json_tags = json.dumps(many_tags)
        tags, err = normalize_tags(json_tags)
        assert tags is None
        assert "at most" in err

    def test_tag_too_long(self):
        """Tag exceeding max length should return error."""
        long_tag = "a" * 257
        tags, err = normalize_tags([long_tag])
        assert tags is None
        assert "at most" in err

    def test_json_tag_too_long(self):
        """JSON-encoded tag exceeding max length should return error."""
        import json
        long_tag = "a" * 257
        json_tags = json.dumps([long_tag])
        tags, err = normalize_tags(json_tags)
        assert tags is None
        assert "at most" in err

    def test_non_string_in_list(self):
        """Non-string item in list should return error."""
        tags, err = normalize_tags(["valid", 123])
        assert tags is None
        assert "must be a string" in err

    def test_json_non_string_in_array(self):
        """JSON-encoded array with non-string should return error."""
        tags, err = normalize_tags('["valid", 123]')
        assert tags is None
        assert "must be a string" in err

    def test_empty_string_tag(self):
        """Empty string tag should return error."""
        tags, err = normalize_tags(["valid", ""])
        assert tags is None
        assert "must not be empty" in err

    def test_json_empty_string_tag(self):
        """JSON-encoded array with empty string tag should return error."""
        tags, err = normalize_tags('["valid", ""]')
        assert tags is None
        assert "must not be empty" in err

    def test_whitespace_only_tag(self):
        """Whitespace-only tag should return error."""
        tags, err = normalize_tags(["valid", "   "])
        assert tags is None
        assert "must not be empty" in err

    def test_json_whitespace_only_tag(self):
        """JSON-encoded array with whitespace-only tag should return error."""
        tags, err = normalize_tags('["valid", "   "]')
        assert tags is None
        assert "must not be empty" in err

    def test_path_like_tags(self):
        """Path-like tags (e.g., 'references/pa-schemas.md') should work."""
        tags, err = normalize_tags(["references/pa-schemas.md", "core/rules/bootstrap.md"])
        assert err is None
        assert tags == ["references/pa-schemas.md", "core/rules/bootstrap.md"]

    def test_json_path_like_tags(self):
        """JSON-encoded path-like tags should work."""
        tags, err = normalize_tags('["references/pa-schemas.md", "core/rules/bootstrap.md"]')
        assert err is None
        assert tags == ["references/pa-schemas.md", "core/rules/bootstrap.md"]

    def test_special_characters(self):
        """Tags with special characters should work."""
        tags, err = normalize_tags(["tag-1", "tag_2", "tag.3"])
        assert err is None
        assert tags == ["tag-1", "tag_2", "tag.3"]

    def test_json_special_characters(self):
        """JSON-encoded tags with special characters should work."""
        tags, err = normalize_tags('["tag-1", "tag_2", "tag.3"]')
        assert err is None
        assert tags == ["tag-1", "tag_2", "tag.3"]


class TestNormalizeFormat:
    """Test normalize_format function for list_instructions format parameter."""

    def test_none_defaults_to_xml(self):
        """None should default to XML."""
        fmt, err = normalize_format(None)
        assert err is None
        assert fmt == "XML"

    def test_empty_string_defaults_to_xml(self):
        """Empty string should default to XML."""
        fmt, err = normalize_format("")
        assert err is None
        assert fmt == "XML"

    def test_whitespace_only_defaults_to_xml(self):
        """Whitespace-only string should default to XML."""
        fmt, err = normalize_format("   ")
        assert err is None
        assert fmt == "XML"

    def test_xml_explicit(self):
        """Explicit 'XML' should be accepted."""
        fmt, err = normalize_format("XML")
        assert err is None
        assert fmt == "XML"

    def test_xml_with_whitespace(self):
        """'XML' with surrounding whitespace should be trimmed and accepted."""
        fmt, err = normalize_format("  XML  ")
        assert err is None
        assert fmt == "XML"

    def test_flat_explicit(self):
        """Explicit 'flat' should be accepted."""
        fmt, err = normalize_format("flat")
        assert err is None
        assert fmt == "flat"

    def test_flat_with_whitespace(self):
        """'flat' with surrounding whitespace should be trimmed and accepted."""
        fmt, err = normalize_format("  flat  ")
        assert err is None
        assert fmt == "flat"

    def test_case_insensitive_xml_lowercase(self):
        """Lowercase 'xml' should be accepted and normalized to 'XML'."""
        fmt, err = normalize_format("xml")
        assert err is None
        assert fmt == "XML"

    def test_case_insensitive_flat_uppercase(self):
        """Uppercase 'FLAT' should be accepted and normalized to 'flat'."""
        fmt, err = normalize_format("FLAT")
        assert err is None
        assert fmt == "flat"

    def test_case_insensitive_mixed_case_xml(self):
        """Mixed case like 'Xml' should be accepted and normalized to 'XML'."""
        fmt, err = normalize_format("Xml")
        assert err is None
        assert fmt == "XML"

    def test_case_insensitive_mixed_case_flat(self):
        """Mixed case like 'Flat' should be accepted and normalized to 'flat'."""
        fmt, err = normalize_format("Flat")
        assert err is None
        assert fmt == "flat"

    def test_invalid_format_json(self):
        """Invalid format 'JSON' should be rejected."""
        fmt, err = normalize_format("JSON")
        assert fmt is None
        assert err == "Error: format must be 'XML' or 'flat' (case-insensitive)"

    def test_invalid_format_plain(self):
        """Invalid format 'plain' should be rejected."""
        fmt, err = normalize_format("plain")
        assert fmt is None
        assert err == "Error: format must be 'XML' or 'flat' (case-insensitive)"

    def test_invalid_format_text(self):
        """Invalid format 'text' should be rejected."""
        fmt, err = normalize_format("text")
        assert fmt is None
        assert err == "Error: format must be 'XML' or 'flat' (case-insensitive)"

    def test_non_string_integer(self):
        """Non-string input (integer) should be rejected."""
        fmt, err = normalize_format(123)
        assert fmt is None
        assert err == "Error: format must be a string"

    def test_non_string_list(self):
        """Non-string input (list) should be rejected."""
        fmt, err = normalize_format(["XML"])
        assert fmt is None
        assert err == "Error: format must be a string"

    def test_non_string_dict(self):
        """Non-string input (dict) should be rejected."""
        fmt, err = normalize_format({"format": "XML"})
        assert fmt is None
        assert err == "Error: format must be a string"

    def test_custom_field_name(self):
        """Custom field name should appear in error messages."""
        fmt, err = normalize_format("invalid", field="output_format")
        assert fmt is None
        assert "output_format" in err

    def test_valid_values_case_insensitive(self):
        """XML and flat should be valid in any case, normalized to canonical form."""
        # Test XML variants
        xml_variants = [("XML", "XML"), ("xml", "XML"), ("Xml", "XML"), ("xMl", "XML")]
        for input_val, expected in xml_variants:
            fmt, err = normalize_format(input_val)
            assert err is None, f"Expected {input_val} to be valid"
            assert fmt == expected, f"Expected {input_val} to normalize to {expected}"
        
        # Test flat variants
        flat_variants = [("flat", "flat"), ("FLAT", "flat"), ("Flat", "flat"), ("FlaT", "flat")]
        for input_val, expected in flat_variants:
            fmt, err = normalize_format(input_val)
            assert err is None, f"Expected {input_val} to be valid"
            assert fmt == expected, f"Expected {input_val} to normalize to {expected}"
        
        # Test invalid values
        invalid_values = ["JSON", "YAML", "Text", "Plain", "Raw", "compressed", "Compressed"]
        for value in invalid_values:
            fmt, err = normalize_format(value)
            assert fmt is None, f"Expected {value} to be invalid"
            assert err == "Error: format must be 'XML' or 'flat' (case-insensitive)"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
