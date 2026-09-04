import typer
import json
import sys
import click
from typing import Literal, Annotated, Optional
from string import punctuation
from .algorithms import v1, v2, v3
from rich import print, box
from rich.table import Table
from .config_handler import ConfigHandler
from pathlib import Path
from itertools import zip_longest
from ._version import __commit_id__, __version__
from .error_handler import ErrorHandler

app = typer.Typer()

presets_app = typer.Typer()
app.add_typer(presets_app, name="presets")

generate_app = typer.Typer()
app.add_typer(generate_app, name="generate")

ch = ConfigHandler()
eh = ErrorHandler()

LATEST_ALGORITHM = 3

def generate_password(master_pass: str, 
                      site_name: str, 
                      char_map: dict[str, str], 
                      spec_chars: list, 
                      version: int, 
                      pass_length: int, 
                      spec_mode: Literal["replace", "insert"],
                      spec_freq: int, 
                      char_types: list,
                      char_types_and_freq: dict[str, int],
                      differentiator: str | None
                     ) -> str:
    """Deterministically generates a password based on the inputs"""

    if differentiator == "":
        differentiator == None
    
    if version == 1:
        return v1.generate(master_pass=master_pass, site_name=site_name, pass_length=pass_length, spec_mode=spec_mode, spec_chars=spec_chars, char_map=char_map, spec_freq=spec_freq)
    elif version == 2:
        return v2.generate(master_pass=master_pass, site_name=site_name, pass_length=pass_length, char_map=char_map, char_types=char_types)
    elif version == 3:
        return v3.generate(master_pass=master_pass, site_name=site_name, pass_length=pass_length, char_types=char_types_and_freq, add_info=differentiator)
    else:
        raise ValueError(f"Unsupported algorithm version: {version}")

@app.command(name="version", help="Display version info")
def version():
    python_version = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"

    version_table = Table(box=box.MINIMAL_DOUBLE_HEAD)
    version_table.add_column(f"\nDeterminist [bold cyan]{__version__}[/]", justify="center")
    version_table.add_row(f"Commit: [bold cyan]{__commit_id__[1:]}[/]")
    version_table.add_row(f"Python: [bold cyan]{python_version}[/]")

    print(version_table)

@generate_app.callback(invoke_without_command=True, help="Generate a password")
def generate_password_cli(ctx: typer.Context,
                          master_pass: Annotated[Optional[str], typer.Option("--master", "-M", help="The master passphrase", rich_help_panel="Required")] = None,
                          site_name: Annotated[Optional[str], typer.Option("--site", "-n", help="The name of the website or any string", rich_help_panel="Required")] = None,
                          preset: Annotated[str | None, typer.Option("--preset", "-p", help="Name of the preset to use", rich_help_panel="General")] = None,
                          version: Annotated[int, typer.Option("--version", "-v", min=1, max=LATEST_ALGORITHM, help="Algorithm version to use", rich_help_panel="General")] = LATEST_ALGORITHM, 
                          pass_length: Annotated[int, typer.Option("--length", "-l", min=6, max=32, help="Length of the generated password", rich_help_panel="General")] = 8, 
                          char_map: Annotated[str, typer.Option("--map", help="The character map used for swapping characters, enter in [bold]JSON[/] format inside a [bold]string[/]", rich_help_panel="Algorithm V1")] = "{}", 
                          spec_chars: Annotated[str, typer.Option("--special", "-s", help="Special characters used for insertion", rich_help_panel="Algorithm V1")] = punctuation, 
                          spec_mode: Annotated[Literal["replace", "insert"], typer.Option("--mode", "-m", help="The special character mode", rich_help_panel="Algorithm V1")] = "insert",
                          spec_freq: Annotated[int, typer.Option("--frequency", "-f", help="Frequency of inserted special characters", rich_help_panel="Algorithm V1")] = 4, 
                          char_types: Annotated[str, typer.Option("--chars", "-c", help="Character sets to use", rich_help_panel="Algorithm V2")] = "special,lowercase,uppercase,digits",
                          lowercase: Annotated[int, typer.Option("--lowercase", "-L", help="Minimum required lowercase characters", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = 1,
                          uppercase: Annotated[int, typer.Option("--uppercase", "-U", help="Minimum required uppercase characters", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = 1,
                          digits: Annotated[int, typer.Option("--digits", "-D", help="Minimum required digits", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = 1,
                          special: Annotated[int, typer.Option("--special-chars", "-S", help="Minimum required special characters", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = 1,
                          differentiator: Annotated[str, typer.Option("--differentiator", "-d", help="Extra information to help differentiate passwords", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = None,
                         ):
    
    if ctx.invoked_subcommand is None:
        if not master_pass:
            master_pass = typer.prompt("Master pass")
            assert master_pass is not None
        if not site_name:
            site_name = typer.prompt("Site name")
            assert site_name is not None

        characters = {"lowercase": lowercase, "uppercase": uppercase, "digits": digits, "special": special}

        if preset:
            content = ch.load_config(preset.lower())

            version = content["general"]["version"] if version == LATEST_ALGORITHM else version
            pass_length = content["general"]["pass_length"] if pass_length == 8 else pass_length

            if version == 1:
                spec_mode = content["v1"]["spec_mode"] if spec_mode == "insert" else spec_mode

                if spec_mode == "insert":
                    spec_freq = content["v1"]["spec_freq"] if spec_freq == 4 else spec_freq
                    spec_chars = content["v1"]["spec_chars"] if spec_chars == punctuation else spec_chars
                else:
                    char_map = content["v1"]["char_map"] if char_map == "{}" else char_map
            elif version == 2:
                char_types = content["v2"]["char_types"] if char_types == "special,lowercase,uppercase,digits" else char_types
            elif version == 3:
                characters = content["v3"]["char_types"] if characters == {"lowercase": 1, "uppercase": 1, "digits": 1, "special": 1} else characters
                differentiator = content["v3"]["differentiator"] if differentiator == None else differentiator
        else:
            pass

        char_map_dict = (
            char_map if isinstance(char_map, dict) else json.loads(char_map)
        )
        spec_chars_list = (
            spec_chars if isinstance(spec_chars, list) else list(spec_chars)
        )
        char_types_list = (
            char_types if isinstance(char_types, list) else char_types.split(",")
        )

        password = generate_password(master_pass=master_pass, site_name=site_name, char_map=char_map_dict, char_types=char_types_list, pass_length=pass_length, version=version, spec_mode=spec_mode, spec_chars=spec_chars_list, spec_freq=spec_freq, char_types_and_freq=characters, differentiator=differentiator)

        result_table = Table(box=box.SIMPLE_HEAD, show_edge=False)
        if password[1]:
            result_table.add_column("\nPassword Generation Successful!", justify="center")
            result_table.add_row(f"Password: [bold cyan]{password[0]}[/]")
            print(result_table)
        else:
            eh.print_error(password[0])

@generate_app.command(name="prompt", help="Generate a password by prompting")
def generate_password_prompt(master_pass: Annotated[str, typer.Option(prompt="Master pass", help="The master passphrase", rich_help_panel="Required", hide_input=True)], 
                             site_name: Annotated[str, typer.Option(prompt="Site name", help="The name of the website or any string", rich_help_panel="Required")], 
                             pass_length: Annotated[int, typer.Option(min=6, max=32, prompt="Password length", help="Length of the generated password", rich_help_panel="General")] = 8, 
                             version: Annotated[int, typer.Option(min=1, max=LATEST_ALGORITHM, prompt="Version", help="Algorithm version to use", rich_help_panel="General")] = LATEST_ALGORITHM,
                             char_map: Annotated[str, typer.Option(help="The character map used for swapping characters, enter in [bold]JSON[/] format", rich_help_panel="Algorithm V1")] = "{}", 
                             spec_chars: Annotated[str, typer.Option(help="Special characters used for insertion, without separation", rich_help_panel="Algorithm V1")] = punctuation, 
                             spec_mode: Annotated[Literal["replace", "insert"], typer.Option(help="The special character mode", rich_help_panel="Algorithm V1")] = "insert",
                             spec_freq: Annotated[int, typer.Option(help="Frequency of inserted special characters", rich_help_panel="Algorithm V1")] = 4, 
                             char_types: Annotated[str, typer.Option(help="Character sets to use, separated by commas", rich_help_panel="Algorithm V2")] = "special,lowercase,uppercase,digits",
                             lowercase: Annotated[int, typer.Option(help="Minimum required lowercase characters", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = 1,
                             uppercase: Annotated[int, typer.Option(help="Minimum required uppercase characters", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = 1,
                             digits: Annotated[int, typer.Option(help="Minimum required digits", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = 1,
                             special: Annotated[int, typer.Option(help="Minimum required special characters", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = 1,
                             differentiator: Annotated[str, typer.Option(help="Extra information to help differentiate passwords", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = None,
                            ):

    if version == 1:
        spec_mode = typer.prompt("Special character mode", default="insert", type=click.Choice(["replace", "insert"]), show_choices=True)

        if spec_mode == "insert":
            spec_chars = typer.prompt("Special characters (no separation)", default=punctuation)
            spec_freq = typer.prompt("Frequency of inserted special characters", default=4)
        else:
            char_map = typer.prompt("Character map (JSON format)", default="{}")

    elif version == 2:
        char_types = typer.prompt("Character types (comma separated)", default="special,lowercase,uppercase,digits")
    elif version == 3:
        lowercase = typer.prompt("Amount of lowercase characters", default=1)
        uppercase = typer.prompt("Amount of uppercase characters", default=1)
        digits = typer.prompt("Amount of digits", default=1)
        special = typer.prompt("Amount of special characters", default=1)
        differentiator = typer.prompt("Differentiator", default="", show_default=False)
    
    char_map_dict = json.loads(char_map)
    spec_chars_list = list(spec_chars)
    char_types_list = char_types.split(',')

    characters = {"lowercase": lowercase, "uppercase": uppercase, "digits": digits, "special": special}

    password = generate_password(master_pass=master_pass, site_name=site_name, char_map=char_map_dict, char_types=char_types_list, pass_length=pass_length, version=version, spec_mode=spec_mode, spec_chars=spec_chars_list, spec_freq=spec_freq, char_types_and_freq=characters, differentiator=None if differentiator == "" else differentiator)

    result_table = Table(box=box.SIMPLE_HEAD, show_edge=False)
    if password[1]:
        result_table.add_column("\nPassword Generation Successful!", justify="center")
        result_table.add_row(f"Password: [bold cyan]{password[0]}[/]")
        print(result_table)
    else:
        eh.print_error(password[0])
        

@presets_app.callback(invoke_without_command=True, help="Manage presets")
def list_presets(ctx: typer.Context):
    if ctx.invoked_subcommand == None:
        default_name = ch.get_files("default")
        invalid_paths = ch.get_files('path')[1]
        default_name = default_name[0] if default_name else ""
        details = {name: {"description": desc, "path": str(path), "is_default": (name == default_name)} for name, desc, path in zip_longest(ch.get_files("name"), ch.get_files("description"), ch.get_files("path")[0], fillvalue=None)}
    
        preset_table = Table(box=box.SIMPLE_HEAD, show_edge=False)
        preset_table.add_column("Preset")
        preset_table.add_column("Description")
        preset_table.add_column("Path")
        preset_table.add_column("Default?")

        for i, j in details.items():
            preset_table.add_row(f"[bold blue]{i}[/]", j["description"], j["path"], str(j["is_default"]))

        if not any(invalid_paths):
            pass
        else:
            for i in invalid_paths:
                preset_table.add_row(f"[bold red]{i.name}[/]", "[bold red]Invalid file![/]", f"[bold red]{str(i)}[/]", "[bold red]---[/]")

            
        print(preset_table)

@presets_app.command(name="save", help="[bold green]Saves[/] preset to config directory")
def save_preset(path: Annotated[Path, typer.Argument(dir_okay=False, file_okay=True, exists=True, help="Path to the preset to install")]):
    try:
        ch.save_config(path)
        print(f"Successfully saved {path.name}")
    except Exception as e:
        eh.print_error(e)

@presets_app.command(name="delete", help="Permanently [bold red]deletes[/] a preset")
def delete_preset(file_name: Annotated[str, typer.Argument(help="Name of the preset to delete")], force: Annotated[bool, typer.Option("--force", "-f", help="Forces deletion of default preset")] = False):
    try:
        ch.delete_config(file_name, force)
        print(f"Successfully deleted {file_name}!")
    except Exception as e:
        eh.print_error(e)

@presets_app.command(name="default", help="[bold blue]Sets[/] a preset as default")
def set_default_preset(filename: Annotated[str, typer.Argument(help="Name of the preset to set as default")]):
    try:
        ch.set_default(filename)
        print(f"Successfully set {filename} as default")
    except Exception as e:
        eh.print_error(e)

@presets_app.command(name="create", help="[bold cyan]Creates[/] a new preset (to edit a preset, use the same name with different options)")
def create_preset(name: Annotated[str, typer.Option("--preset-name", help="Name of the preset to be created")],
                  description: Annotated[str | None, typer.Option("--desc", help="The description of the preset")] = None,
                  default: Annotated[bool, typer.Option("--default" , "-d", help="Whether the preset should be set as default")] = False,
                  version: Annotated[int, typer.Option("--version", "-v", min=1, max=LATEST_ALGORITHM, help="Algorithm version to use", rich_help_panel="General")] = LATEST_ALGORITHM, 
                  pass_length: Annotated[int, typer.Option("--length", "-l", min=6, max=32, help="Length of the generated password", rich_help_panel="General")] = 8, 
                  char_map: Annotated[str, typer.Option("--map", help="The character map used for swapping characters, enter in [bold]JSON[/] format inside a [bold]string[/]", rich_help_panel="Algorithm V1")] = "{}", 
                  spec_chars: Annotated[str, typer.Option("--special", "-s", help="Special characters used for insertion", rich_help_panel="Algorithm V1")] = punctuation, 
                  spec_mode: Annotated[Literal["replace", "insert"], typer.Option("--mode", "-m", help="The special character mode", rich_help_panel="Algorithm V1")] = "insert",
                  spec_freq: Annotated[int, typer.Option("--frequency", "-f", help="Frequency of inserted special characters", rich_help_panel="Algorithm V1")] = 4, 
                  char_types: Annotated[str, typer.Option("--chars", "-c", help="Character sets to use", rich_help_panel="Algorithm V2")] = "special,lowercase,uppercase,digits",
                  lowercase: Annotated[int, typer.Option("--lowercase", "-L", help="Minimum required lowercase characters", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = 1,
                  uppercase: Annotated[int, typer.Option("--uppercase", "-U", help="Minimum required uppercase characters", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = 1,
                  digits: Annotated[int, typer.Option("--digits", "-D", help="Minimum required digits", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = 1,
                  special: Annotated[int, typer.Option("--special-chars", "-S", help="Minimum required special characters", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = 1,
                  differentiator: Annotated[str, typer.Option("--differentiator", "-d", help="Extra information to help differentiate passwords", rich_help_panel="Algorithm V3 (Use 0 to exclude character type)")] = "",
                  ):

    
    char_map_dict = (
        (char_map if isinstance(char_map, dict) else json.loads(char_map)) if char_map else None
    )

    characters = {"lowercase": lowercase, "uppercase": uppercase, "digits": digits, "special": special}

    ch.create_preset(name=name, description=description, default=default, version=version, pass_length=pass_length, char_map=char_map_dict, spec_chars=spec_chars, spec_mode=spec_mode, spec_freq=spec_freq, char_types=char_types, v3_types=characters, differentiator=differentiator)
    