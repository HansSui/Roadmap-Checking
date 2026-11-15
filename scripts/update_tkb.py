#!/usr/bin/env python3
"""Export the lecturer analysis workbook to the JSON consumed by the site."""

from __future__ import annotations

import argparse
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any

import openpyxl


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "data/TKBChuan/NT_CS_SE_course_lecturer_analysis.xlsx"
DEFAULT_OUTPUT = ROOT / "data/TKBChuan/lecturer_analysis.json"

COURSE_COLUMNS = {
    "Mã MH": "ma",
    "Tên môn học": "ten",
    "Nhóm": "nhom",
    "TB lớp / HK mở": "tb_lop_hk",
    "TB lớp HK1": "tb_lop_hk1",
    "TB lớp HK2": "tb_lop_hk2",
    "TB sĩ số lớp": "tb_si_so",
    "TB lớp TH / HK mở": "tb_lop_th",
    "Số GV LT": "so_gv",
    "GV chính (% lớp)": "gv_chinh",
    "% lớp chưa phân công": "pct_chua_pc",
    "Mở gần nhất": "mo_gan_nhat",
}

STAFF_COLUMNS = {
    "Mã MH": "ma",
    "Mã GV": "ma_gv",
    "Giảng viên": "gv",
    "Số lớp tham gia": "so_lop",
    "Số lớp quy đổi*": "so_lop_qd",
    "Tổng lớp của môn": "tong_lop",
    "% lớp": "pct",
    "Số HK đã dạy": "so_hk",
    "Các HK đã dạy": "cac_hk",
    "Dạy gần nhất": "day_gan",
}


def clean(value: Any) -> Any:
    if isinstance(value, str):
        return value.replace("\xa0", " ").strip()
    return value


def sheet_rows(workbook: openpyxl.Workbook, name: str, required: dict[str, str]) -> list[dict[str, Any]]:
    if name not in workbook.sheetnames:
        raise ValueError(f"Missing sheet: {name}")
    sheet = workbook[name]
    rows = sheet.iter_rows(values_only=True)
    headers = next(rows, None)
    if not headers:
        raise ValueError(f"Empty sheet: {name}")
    index = {clean(value): i for i, value in enumerate(headers) if clean(value)}
    missing = [column for column in required if column not in index]
    if missing:
        raise ValueError(f"{name}: missing columns: {', '.join(missing)}")

    result = []
    for row in rows:
        if not any(value is not None for value in row):
            continue
        record = {target: clean(row[index[source]]) for source, target in required.items()}
        for field in ("pct", "pct_chua_pc"):
            if field in record and record[field] is not None:
                record[field] = round(record[field], 4)
        for field in ("ma_gv", "gv_hk_moi"):
            if field in record and record[field] is None:
                record[field] = ""
        if record.get("ma"):
            result.append(record)
    return result


def export(input_path: Path) -> dict[str, list[dict[str, Any]]]:
    workbook = openpyxl.load_workbook(input_path, read_only=True, data_only=True)
    semesters, courses = course_rows(workbook)
    staff_columns = dict(STAFF_COLUMNS)
    latest_column = f"Đang dạy ở {semesters[-1]}?"
    staff_columns[latest_column] = "dang_day"
    return {
        "semesters": semesters,
        "courses": courses,
        "lecturers": sheet_rows(workbook, "Giảng viên LT & % ", staff_columns),
        "tas": sheet_rows(workbook, "Trợ giảng TH & %", staff_columns),
    }


def course_rows(workbook: openpyxl.Workbook) -> tuple[list[str], list[dict[str, Any]]]:
    sheet = workbook["Tổng quan môn học"]
    rows = sheet.iter_rows(values_only=True)
    headers = next(rows, None)
    if not headers:
        raise ValueError("Empty sheet: Tổng quan môn học")
    index = {clean(value): i for i, value in enumerate(headers) if clean(value)}
    columns = dict(COURSE_COLUMNS)
    open_count = next((header for header in index if header.startswith("Số HK mở (")), None)
    if open_count:
        columns["Số HK mở (dynamic)"] = "so_hk_mo"
        index["Số HK mở (dynamic)"] = index[open_count]
    missing = [column for column in columns if column not in index]
    if missing:
        raise ValueError(f"Tổng quan môn học: missing columns: {', '.join(missing)}")
    semesters = [header for header in index if re.fullmatch(r"HK[12] \d\d-\d\d", header)]
    latest_open = next((header for header in index if header.startswith("Mở ở ")), None)
    latest_staff = next((header for header in index if header.startswith("GV đang dạy ở ")), None)
    result = []
    for row in rows:
        if not any(value is not None for value in row):
            continue
        record = {target: clean(row[index[source]]) for source, target in columns.items()}
        record["history"] = {
            semester: row[index[semester]] or 0
            for semester in semesters
        }
        record["mo_gan_nhat"] = record.get("mo_gan_nhat", "")
        record["mo_moi_nhat"] = clean(row[index[latest_open]]) if latest_open else ""
        record["gv_hk_moi"] = clean(row[index[latest_staff]]) if latest_staff else ""
        if record["ma"]:
            result.append(record)
    return semesters, result


def write_json(output_path: Path, data: dict[str, list[dict[str, Any]]]) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f"{output_path.name}.", dir=output_path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, separators=(",", ":"))
            file.write("\n")
        os.replace(temporary, output_path)
    except Exception:
        os.unlink(temporary)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT, help="analysis workbook (.xlsx)")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="site JSON output")
    parser.add_argument("--check", action="store_true", help="validate and report counts without writing")
    args = parser.parse_args()

    data = export(args.input)
    counts = ", ".join(f"{key}={len(value)}" for key, value in data.items())
    if args.check:
        print(f"OK: {args.input} ({counts})")
        return
    write_json(args.output, data)
    print(f"Wrote {args.output} ({counts})")


if __name__ == "__main__":
    main()
