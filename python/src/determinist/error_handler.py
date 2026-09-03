from rich import print, box
from rich.table import Table

class DefaultConfigError(Exception):
    pass

class InvalidFileTypeError(Exception):
    pass

class ErrorHandler:
    def print_error(self, error: Exception | str) -> None:
            error_table = Table(box=box.SIMPLE_HEAD, show_edge=False)
            error_table.add_column("\nCommand Failure!", justify="center")
            error_table.add_row(f"[bold red]{error}[/]")

            print(error_table)