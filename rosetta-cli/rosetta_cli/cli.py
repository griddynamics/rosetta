"""Rosetta CLI entry point."""


import argparse
import sys
from collections.abc import Callable
from typing import TypeAlias

from rosetta_cli import __version__ as _CLI_VERSION
from .commands.base_command import BaseCommand
from .commands.cleanup_command import CleanupCommand
from .commands.list_command import ListCommand
from .commands.parse_command import ParseCommand
from .commands.publish_command import PublishCommand
from .commands.verify_command import VerifyCommand
from .ims_config import IMSConfig
from .ragflow_client import RAGFlowClient
from .typing_utils import CommandArgs

CommandClass: TypeAlias = Callable[[RAGFlowClient, IMSConfig], BaseCommand]


# Command registry mapping command names to their classes
COMMAND_REGISTRY: dict[str, CommandClass] = {
    'publish': PublishCommand,
    'verify': VerifyCommand,
    'list-dataset': ListCommand,
    'cleanup-dataset': CleanupCommand,
    'parse': ParseCommand,
}


def _print_version() -> None:
    """Print the CLI version."""
    print(f"Rosetta Version: {_CLI_VERSION}")


def execute_command(command_name: str, args: CommandArgs, client: RAGFlowClient, config: IMSConfig) -> int:
    """
    Execute a command by name using the command registry.
    
    Args:
        command_name: Name of the command to execute
        args: Parsed command-line arguments
        client: RAGFlow client instance
        config: RAGFlow configuration
    
    Returns:
        Exit code (0 for success, 1 for failure)
    """
    command_class = COMMAND_REGISTRY.get(command_name)
    if not command_class:
        print(f"Unknown command: {command_name}")
        return 1
    
    command = command_class(client, config)
    return command.execute(args)


def main() -> int:
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Rosetta CLI - Publish knowledge base content to RAGFlow and manage datasets\n"
                    "All commands include performance timing measurements.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Print CLI version
  rosetta-cli version

  # Publish knowledge base content from a folder (with timing)
  rosetta-cli publish ../instructions

  # Publish with dry-run (no actual upload)
  rosetta-cli publish ../business --dry-run

  # Force republish (ignore change detection)
  rosetta-cli publish ../instructions --force

  # List documents in dataset
  rosetta-cli list-dataset

  # List documents in specific dataset
  rosetta-cli list-dataset --dataset aia-r1

  # Cleanup (delete all documents from) a dataset
  rosetta-cli cleanup-dataset --dataset aia-r1

  # Preview cleanup with dry-run (shows what would be deleted)
  rosetta-cli cleanup-dataset --dataset aia-r1 --dry-run

  # Cleanup documents with specific prefix
  rosetta-cli cleanup-dataset --dataset aia-r1 --prefix "aqa-phase"

  # Cleanup documents with specific tags (space-separated)
  rosetta-cli cleanup-dataset --dataset aia-r1 --tags "r1 agents"

  # Cleanup documents with specific tags (comma-separated)
  rosetta-cli cleanup-dataset --dataset aia-r1 --tags "r1,agents"

  # Preview cleanup with prefix filter
  rosetta-cli cleanup-dataset --dataset aia-r1 --prefix "aqa-phase" --dry-run

  # Preview cleanup with tags filter
  rosetta-cli cleanup-dataset --dataset aia-r1 --tags "r1 agents" --dry-run

  # Cleanup with force (skip confirmation)
  rosetta-cli cleanup-dataset --dataset aia-r1 --force
  
  # Cleanup with prefix and force
  rosetta-cli cleanup-dataset --dataset aia-r1 --prefix "aqa-phase" --force

  # Cleanup with tags and force
  rosetta-cli cleanup-dataset --dataset aia-r1 --tags "r1,agents" --force

  # Parse documents in dataset (retry failed/unparsed)
  rosetta-cli parse --dataset aia-r1

  # Force re-parse all documents (e.g., after changing parser config)
  rosetta-cli parse --dataset aia-r1 --force

  # Preview which documents would be parsed
  rosetta-cli parse --dataset aia-r1 --dry-run

  # Verify connection
  rosetta-cli verify

  # Use different environment
  rosetta-cli publish ../instructions --env production

Performance Notes:
  - All commands show execution time (⏱️ Total time: X.XXs)
  - Publishing ~10-15s per file (embedding generation)
  - Change detection skips unchanged files (77% faster)
  - API key verification timing shown when applicable

Tag-in-Title Format:
  - Documents are published with tags in title: [tag1][tag2] filename.ext
  - Example: [instructions][agents][r1] agents.md

Frontmatter Metadata (publish flow):
  - Supported keys: tags, sort_order
  - tags can be list or comma-separated string
  - tags are merged with path-based tags (case-insensitive dedupe)
  - sort_order is persisted to metadata and affects MCP bundling order
  - original_path/resource_path are normalized from instructions-relative path when applicable
"""
    )
    
    # Global arguments
    parser.add_argument(
        '--env',
        type=str,
        default=None,
        help='Environment (local, dev, test, production)'
    )
    parser.add_argument(
        '--env-file',
        type=str,
        default=None,
        help='Explicit path to a .env file'
    )
    
    # Subcommands
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # Publish command
    publish_parser = subparsers.add_parser(
        'publish',
        help='Publish knowledge base content to RAGFlow'
    )
    publish_parser.add_argument(
        'path',
        type=str,
        help='Path to content file or folder (e.g., instructions/, business/)'
    )
    publish_parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simulate publishing without actual upload'
    )
    publish_parser.add_argument(
        '--force',
        action='store_true',
        help='Force republish all files, ignoring change detection'
    )
    publish_parser.add_argument(
        '--no-parse',
        action='store_true',
        help='Skip parsing documents after upload (for debugging)'
    )
    publish_parser.add_argument(
        '--parse-timeout',
        type=int,
        default=300,
        help='Timeout for parsing in seconds (default: 300)'
    )
    publish_parser.add_argument(
        '--env',
        type=str,
        default=None,
        help='Environment (local, dev, test, production)'
    )
    publish_parser.add_argument(
        '--env-file',
        type=str,
        default=None,
        help='Explicit path to a .env file'
    )
    
    # Verify command
    verify_parser = subparsers.add_parser(
        'verify',
        help='Verify RAGFlow connection and API key'
    )
    verify_parser.add_argument(
        '--env',
        type=str,
        default=None,
        help='Environment (local, dev, test, production)'
    )
    verify_parser.add_argument(
        '--env-file',
        type=str,
        default=None,
        help='Explicit path to a .env file'
    )

    # Version command
    subparsers.add_parser(
        'version',
        help='Print CLI version and exit'
    )
    
    # List dataset command
    list_parser = subparsers.add_parser(
        'list-dataset',
        help='List documents in a dataset'
    )
    list_parser.add_argument(
        '--dataset',
        type=str,
        default=None,
        help='Dataset name (defaults to configured dataset)'
    )
    list_parser.add_argument(
        '--env',
        type=str,
        default=None,
        help='Environment (local, dev, test, production)'
    )
    list_parser.add_argument(
        '--env-file',
        type=str,
        default=None,
        help='Explicit path to a .env file'
    )
    
    # Cleanup dataset command
    cleanup_parser = subparsers.add_parser(
        'cleanup-dataset',
        help='Delete all documents from a dataset'
    )
    cleanup_parser.add_argument(
        '--dataset',
        type=str,
        default=None,
        help='Dataset name (defaults to configured dataset)'
    )
    cleanup_parser.add_argument(
        '--prefix',
        type=str,
        default=None,
        help='Only delete documents with titles starting with this prefix (e.g., "aqa-phase")'
    )
    cleanup_parser.add_argument(
        '--tags',
        type=str,
        default=None,
        help='Only delete documents with these tags (space or comma separated, e.g., "r1 agents" or "r1,agents")'
    )
    cleanup_parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be deleted without actually deleting'
    )
    cleanup_parser.add_argument(
        '--force',
        action='store_true',
        help='Skip confirmation prompt'
    )
    cleanup_parser.add_argument(
        '--env',
        type=str,
        default=None,
        help='Environment (local, dev, test, production)'
    )
    cleanup_parser.add_argument(
        '--env-file',
        type=str,
        default=None,
        help='Explicit path to a .env file'
    )
    
    # Parse command
    parse_parser = subparsers.add_parser(
        'parse',
        help='Trigger parsing for documents in a dataset'
    )
    parse_parser.add_argument(
        '--dataset',
        type=str,
        default=None,
        help='Dataset name (defaults to configured dataset)'
    )
    parse_parser.add_argument(
        '--force',
        action='store_true',
        help='Force re-parse ALL documents, even if already parsed'
    )
    parse_parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show which documents would be parsed without actually parsing'
    )
    parse_parser.add_argument(
        '--yes',
        action='store_true',
        help='Skip confirmation prompt'
    )
    parse_parser.add_argument(
        '--parse-timeout',
        type=int,
        default=300,
        help='Timeout for parsing in seconds (default: 300)'
    )
    parse_parser.add_argument(
        '--env',
        type=str,
        default=None,
        help='Environment (local, dev, test, production)'
    )
    parse_parser.add_argument(
        '--env-file',
        type=str,
        default=None,
        help='Explicit path to a .env file'
    )
    
    # Parse arguments
    args = parser.parse_args()
    
    # Check if command was provided
    if not args.command:
        parser.print_help()
        return 1

    if args.command == 'version':
        _print_version()
        return 0
    
    try:
        # Load configuration
        config = IMSConfig.from_env(env_file=args.env_file, environment=args.env)
        
        # Validate configuration
        config.validate()

        _print_version()
        print(f"Rosetta Environment: {config.environment}")
        
        # Initialize RAGFlow client
        client = RAGFlowClient(
            api_key=config.api_key,
            base_url=config.base_url,
            embedding_model=config.embedding_model,
            chunk_method=config.chunk_method,
            parser_config=config.parser_config,
            page_size=config.page_size
        )
        
        return execute_command(args.command, args, client, config)
            
    except ValueError as e:
        print(f"✗ Configuration error: {e}")
        print("\nPlease ensure you have:")
        print("1. Created a .env file (copy from env.template)")
        print("2. Set RAGFLOW_BASE_URL and RAGFLOW_API_KEY")
        return 1
    except KeyboardInterrupt:
        print("\n\nOperation cancelled.")
        return 1
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
