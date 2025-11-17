"""
Utility CLI to manage Gemini File Search Stores.

Usage examples:

1. List existing stores:
    python scripts/manage_file_search_store.py list

2. Create a store (optionally set display name):
    python scripts/manage_file_search_store.py create --display-name "LLCT Documents"

3. Upload a file directly to a store:
    python scripts/manage_file_search_store.py upload \
        --store fileSearchStores/your-store-id \
        --file ./docs/sample.pdf \
        --display-name "Sample document"

The script expects GEMINI_API_KEY to be set in the environment.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import Any, Optional

from google import genai

try:
    from dotenv import load_dotenv

    load_dotenv()
except Exception:
    # dotenv is optional; ignore if not installed
    pass


def _require_api_key() -> str:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY environment variable is required.", file=sys.stderr)
        sys.exit(1)
    return api_key


def _wait_for_operation(client: genai.Client, operation: Any, poll_interval: int = 5):
    """Poll long-running operation until completion."""
    while getattr(operation, "done", False) is False:
        time.sleep(poll_interval)
        operation = client.operations.get(operation)
    return operation


def cmd_list_stores(client: genai.Client):
    stores = list(client.file_search_stores.list())
    if not stores:
        print("No File Search stores found.")
        return

    for store in stores:
        name = getattr(store, "name", "<unknown>")
        display_name = getattr(store, "display_name", "")
        created = getattr(store, "create_time", "")
        print(f"- {name}  (display_name={display_name!r}, created={created})")


def cmd_create_store(client: genai.Client, display_name: Optional[str]):
    payload = {"display_name": display_name} if display_name else {}
    store = client.file_search_stores.create(config=payload or None)
    print("Created store:")
    store_dict = {
        "name": getattr(store, "name", None),
        "display_name": getattr(store, "display_name", None),
        "create_time": str(getattr(store, "create_time", "")),
    }
    print(json.dumps(store_dict, indent=2))


def cmd_upload_file(
    client: genai.Client,
    store_name: str,
    file_path: str,
    display_name: Optional[str],
    chunk_size: Optional[int],
    chunk_overlap: Optional[int],
):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}", file=sys.stderr)
        sys.exit(1)

    config: dict[str, Any] = {}
    if display_name:
        config["display_name"] = display_name
    if chunk_size or chunk_overlap:
        config["chunking_config"] = {
            "white_space_config": {
                "max_tokens_per_chunk": chunk_size or 200,
                "max_overlap_tokens": chunk_overlap or 20,
            }
        }

    operation = client.file_search_stores.upload_to_file_search_store(
        file=file_path,
        file_search_store_name=store_name,
        config=config or None,
    )
    print("Upload started, waiting for completion...")
    result = _wait_for_operation(client, operation)
    print("Upload finished.")
    result_dict = {
        "name": getattr(result, "name", None),
        "done": getattr(result, "done", None),
        "metadata": getattr(result, "metadata", None),
        "error": getattr(result, "error", None),
        "response": getattr(result, "response", None),
    }
    print(json.dumps(result_dict, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Manage Gemini File Search stores")
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("list", help="List all File Search stores")

    create_parser = subparsers.add_parser(
        "create", help="Create a new File Search store"
    )
    create_parser.add_argument(
        "--display-name",
        help="Optional display name for the store",
    )

    upload_parser = subparsers.add_parser("upload", help="Upload a file to a store")
    upload_parser.add_argument(
        "--store",
        required=True,
        help="Target File Search store name (format: fileSearchStores/<id>)",
    )
    upload_parser.add_argument(
        "--file",
        required=True,
        help="Path to file to upload",
    )
    upload_parser.add_argument(
        "--display-name",
        help="Optional display name for the uploaded file",
    )
    upload_parser.add_argument(
        "--chunk-size",
        type=int,
        help="Optional max tokens per chunk (default 200)",
    )
    upload_parser.add_argument(
        "--chunk-overlap",
        type=int,
        help="Optional overlap tokens between chunks (default 20)",
    )

    args = parser.parse_args()
    client = genai.Client(api_key=_require_api_key())

    if args.command == "list":
        cmd_list_stores(client)
    elif args.command == "create":
        cmd_create_store(client, getattr(args, "display_name", None))
    elif args.command == "upload":
        cmd_upload_file(
            client=client,
            store_name=args.store,
            file_path=args.file,
            display_name=getattr(args, "display_name", None),
            chunk_size=getattr(args, "chunk_size", None),
            chunk_overlap=getattr(args, "chunk_overlap", None),
        )
    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
