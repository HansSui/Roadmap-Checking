#!/usr/bin/env python3
"""Rebuild the lecturer analysis workbook from one or more TKB workbooks."""

from __future__ import annotations

import argparse
import re
import unicodedata
from collections import defaultdict
from pathlib import Path
from statistics import mean
from typing import Any

import openpyxl
from openpyxl.styles import Font


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data/TKBChuan"
DEFAULT_OUTPUT = DATA_DIR / "NT_CS_SE_course_lecturer_analysis.xlsx"
TARGET = re.compile(r"^(NT|CS|SE)\w*$", re.IGNORECASE)


def text(value: Any) -> str:
    return str(value).replace("\xa0", " ").strip() if value is not None else ""


def key(value: Any) -> str:
    value = unicodedata.normalize("NFKD", text(value)).encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Z0-9]+", "", value.upper())


def number(value: Any) -> float | None:
    match = re.search(r"-?\d+(?:[.,]\d+)?", text(value))
    return float(match.group().replace(",", ".")) if match else None


def semester_label(title: str) -> str:
    match = re.search(r"HOCKY\s*([12]).*?(\d{4})\D*(\d{4})", key(title))
    if not match:
        raise ValueError(f"Cannot determine semester from: {title}")
    return f"HK{match.group(1)} {match.group(2)[-2:]}-{match.group(3)[-2:]}"


def find_header(sheet: openpyxl.worksheet.worksheet.Worksheet) -> tuple[int, dict[str, int]]:
    for row_number, row in enumerate(sheet.iter_rows(max_row=12, values_only=True), 1):
        indexes = {key(value): i for i, value in enumerate(row) if value is not None}
        if "MAMH" in indexes and "MALOP" in indexes and ("TENMH" in indexes or "TENMONHOC" in indexes):
            return row_number, indexes
    raise ValueError(f"{sheet.title}: TKB header not found")


def rows_from_file(path: Path) -> tuple[str, list[dict[str, Any]]]:
    workbook = openpyxl.load_workbook(path, read_only=True, data_only=True)
    records: list[dict[str, Any]] = []
    label = None
    for sheet in workbook.worksheets:
        header_row, indexes = find_header(sheet)
        title = " ".join(text(value) for row in sheet.iter_rows(max_row=header_row, values_only=True) for value in row)
        label = label or semester_label(title)
        is_th = "TH" in key(sheet.title) and "LT" not in key(sheet.title)
        for row in sheet.iter_rows(min_row=header_row + 1, values_only=True):
            code = text(row[indexes["MAMH"]])
            class_code = text(row[indexes["MALOP"]])
            if not TARGET.match(code) or not class_code:
                continue
            practical = number(row[indexes.get("THUCHANH", -1)]) if "THUCHANH" in indexes else None
            kind = "th" if is_th or (practical is not None and practical > 0) else "lt"
            staff_index = indexes.get("TENGV", indexes.get("TENGIANGVIEN", indexes.get("TENTROGIANG", -1)))
            staff = text(row[staff_index]) if staff_index >= 0 else ""
            records.append({
                "ma": code,
                "ten": text(row[indexes["TENMH"] if "TENMH" in indexes else indexes["TENMONHOC"]]),
                "lop": class_code,
                "staff": staff,
                "staff_id": text(row[indexes.get("MAGV", indexes.get("MAGIANGVIEN", -1))]),
                "size": number(row[indexes.get("SISO", -1)]),
                "kind": kind,
                "semester": label,
            })
    if label is None:
        raise ValueError(f"No TKB sheets found in {path}")
    return label, records


def unique_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen = set()
    result = []
    for record in records:
        identity = (record["ma"], record["lop"], record["kind"], record["staff"], record["semester"])
        if identity not in seen:
            seen.add(identity)
            result.append(record)
    return result


def build_workbook(records: list[dict[str, Any]], output: Path) -> tuple[int, int]:
    records = unique_records(records)
    semesters = sorted(
        {r["semester"] for r in records},
        key=lambda s: (int(re.search(r"HK[12] (\d{2})", s).group(1)), int(s[2])),
    )
    by_course: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        by_course[record["ma"]].append(record)

    overview = [
        "Mã MH", "Tên môn học", "Nhóm", *semesters, f"Số HK mở (/{len(semesters)})", "TB lớp / HK mở",
        "TB lớp HK1", "TB lớp HK2", "TB sĩ số lớp", "TB lớp TH / HK mở", "Số GV LT",
        "GV chính (% lớp)", "% lớp chưa phân công", "Mở gần nhất",
        f"Mở ở {semesters[-1]} (mới nhất)?", "GV đang dạy ở {0} (mới nhất)",
    ]
    overview[-1] = f"GV đang dạy ở {semesters[-1]} (mới nhất)"
    lecturer_headers = ["Mã MH", "Tên môn học", "Nhóm", "Mã GV", "Giảng viên", "Số lớp tham gia",
                        "Số lớp quy đổi*", "Tổng lớp của môn", "% lớp", "Số HK đã dạy",
                        "Các HK đã dạy", "Dạy gần nhất", f"Đang dạy ở {semesters[-1]}?"]
    th_headers = lecturer_headers[:]
    th_by_course: dict[str, list[dict[str, Any]]] = defaultdict(list)

    overview_rows = []
    lecturer_rows: list[list[Any]] = []
    ta_rows: list[list[Any]] = []
    for code in sorted(by_course):
        course_records = by_course[code]
        lt = [r for r in course_records if r["kind"] == "lt"]
        th = [r for r in course_records if r["kind"] == "th"]
        sem_lt = {s: [r for r in lt if r["semester"] == s] for s in semesters}
        sem_th = {s: [r for r in th if r["semester"] == s] for s in semesters}
        opened = [s for s in semesters if sem_lt[s]]
        counts = [len({r["lop"] for r in sem_lt[s]}) for s in opened]
        hk1 = [len({r["lop"] for r in sem_lt[s]}) for s in opened if s.startswith("HK1")]
        hk2 = [len({r["lop"] for r in sem_lt[s]}) for s in opened if s.startswith("HK2")]
        sizes = [r["size"] for r in lt if r["size"] is not None]
        th_counts = [len({r["lop"] for r in sem_th[s]}) for s in opened]
        staff_counts: dict[str, int] = defaultdict(int)
        staff_names: dict[str, str] = {}
        for r in lt:
            staff = r["staff"] or "(Chưa phân công / TBA)"
            staff_counts[staff] += 1
            staff_names[staff] = r["staff"]
        total = len(lt)
        assigned = [(staff, count) for staff, count in staff_counts.items() if staff != "(Chưa phân công / TBA)"]
        assigned.sort(key=lambda item: (-item[1], item[0]))
        leaders = ", ".join(f"{name} ({round(count / total * 100)}%)" for name, count in assigned[:3]) or "—"
        latest = opened[-1] if opened else ""
        latest_staff = sorted({r["staff"] for r in sem_lt.get(latest, []) if r["staff"]})
        overview_rows.append([
            code, course_records[0]["ten"], code[:2], *[len({r["lop"] for r in sem_lt[s]}) for s in semesters],
            len(opened), round(mean(counts), 2) if counts else 0,
            round(mean(hk1), 2) if hk1 else None, round(mean(hk2), 2) if hk2 else None,
            round(mean(sizes)) if sizes else None, round(mean(th_counts), 2) if th_counts else 0,
            len(assigned), leaders, round(1 - sum(count for _, count in assigned) / total, 4) if total else 1,
            latest, "Có" if latest == semesters[-1] else "Không", ", ".join(latest_staff),
        ])

        for kind, destination in (("lt", lecturer_rows), ("th", ta_rows)):
            kind_records = [r for r in course_records if r["kind"] == kind]
            grouped: dict[tuple[str, str], list[dict[str, Any]]] = defaultdict(list)
            for r in kind_records:
                grouped[(r["staff_id"], r["staff"])].append(r)
            total_classes = len(kind_records)
            for (staff_id, staff), group in sorted(grouped.items(), key=lambda item: item[0][1]):
                grouped_semesters = sorted({r["semester"] for r in group}, key=semesters.index)
                name = staff or "(Chưa phân công / TBA)"
                destination.append([
                    code, course_records[0]["ten"], code[:2], staff_id or None, name,
                    len(group), len(group), total_classes, round(len(group) / total_classes, 4),
                    len(grouped_semesters), ", ".join(grouped_semesters), grouped_semesters[-1],
                    "Có" if grouped_semesters[-1] == semesters[-1] else "Không",
                ])

    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.title = "Tổng quan môn học"
    write_sheet(sheet, overview, overview_rows)
    write_sheet(workbook.create_sheet("Giảng viên LT & % "), lecturer_headers, lecturer_rows)
    write_sheet(workbook.create_sheet("Trợ giảng TH & %"), th_headers, ta_rows)
    th_summary = [["Mã MH", "Tên môn học", *semesters]]
    for code in sorted(by_course):
        course_records = by_course[code]
        th_summary.append([code, by_course[code][0]["ten"], *[
            len({r["lop"] for r in course_records if r["kind"] == "th" and r["semester"] == s}) for s in semesters
        ]])
    write_sheet(workbook.create_sheet("Lớp TH theo HK"), th_summary[0], th_summary[1:])
    notes = workbook.create_sheet("Ghi chú")
    notes.append(["Nguồn được rebuild bởi scripts/integrate_tkb.py."])
    notes.append([f"Phạm vi: mã môn NT*, CS*, SE*; {len(semesters)} học kỳ: {', '.join(semesters)}."])
    for row in notes.iter_rows():
        row[0].font = Font(italic=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    workbook.save(output)
    return len(overview_rows), len(records)


def write_sheet(sheet: openpyxl.worksheet.worksheet.Worksheet, headers: list[str], rows: list[list[Any]]) -> None:
    sheet.append(headers)
    for row in rows:
        sheet.append(row)
    sheet.freeze_panes = "A2"
    sheet.auto_filter.ref = sheet.dimensions
    for cell in sheet[1]:
        cell.font = Font(bold=True)
    for column in sheet.columns:
        width = min(max(len(text(cell.value)) for cell in column) + 2, 32)
        sheet.column_dimensions[column[0].column_letter].width = width


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inputs", nargs="*", type=Path, help="raw TKB workbooks; defaults to all TKB*.xlsx")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="analysis workbook to write")
    args = parser.parse_args()
    discovered = sorted(DATA_DIR.glob("*.xlsx"))
    inputs = discovered + list(args.inputs)
    inputs = [
        path for path in inputs
        if path.resolve() != args.output.resolve() and "analysis" not in path.stem.lower()
    ]
    inputs = list(dict.fromkeys(path.resolve() for path in inputs))
    records = []
    for path in inputs:
        label, rows = rows_from_file(path)
        records.extend(rows)
        print(f"Read {path.name}: {label}, {len(rows)} rows")
    courses, row_count = build_workbook(records, args.output)
    print(f"Wrote {args.output}: {courses} courses, {row_count} schedule rows")


if __name__ == "__main__":
    main()
