# Command Pattern (CLI)

All CLI operations inherit from `BaseCommand`, which provides shared client/config injection, timing, and header printing; each command implements only the `execute(args) -> int` method.

## Problem Solved

CLI commands share authentication setup, timing, and display boilerplate. Repeating this in each command creates drift. The pattern isolates command-specific logic while standardizing lifecycle.

## When to Use

- Adding a new `rosetta-cli` command.
- Any CLI tool with multiple subcommands sharing auth/config.

## Structure

```python
class BaseCommand(ABC):
    def __init__(self, client: RAGFlowClient, config: IMSConfig): ...

    @abstractmethod
    def execute(self, args: CommandArgs) -> int: ...

    def _start_timing(self) -> None: ...
    def _get_elapsed_time(self) -> float: ...
    def _print_timing(self, label: str = "Total time") -> None: ...
    def _print_header(self, title: str) -> None: ...


class PublishCommand(BaseCommand):
    def execute(self, args: CommandArgs) -> int:
        self._start_timing()
        self._print_header("Publishing...")
        AuthService.verify_or_exit(self.client, self.config)
        # ... command-specific logic ...
        self._print_timing()
        return 0
```

## Registration

Commands registered in `rosetta_cli/cli.py` — subcommand name maps to `BaseCommand` subclass instantiated with shared `client` and `config`.

## Occurrences

- `src/rosetta-cli/rosetta_cli/commands/base_command.py` — abstract base
- `src/rosetta-cli/rosetta_cli/commands/publish_command.py` — publish
- `src/rosetta-cli/rosetta_cli/commands/parse_command.py` — trigger parsing
- `src/rosetta-cli/rosetta_cli/commands/verify_command.py` — health check
- `src/rosetta-cli/rosetta_cli/commands/list_command.py` — list dataset
- `src/rosetta-cli/rosetta_cli/commands/cleanup_command.py` — delete documents
- `src/rosetta-cli/rosetta_cli/cli.py` — command registry
