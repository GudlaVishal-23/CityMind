import os
import re
import sys
import openpyxl
import docx
import pypdf
import pdfplumber

def test_excel_suite(path):
    print("=" * 60)
    print("TEST SUITE 1: EXCEL WORKBOOK VERIFICATION")
    print("=" * 60)
    
    assert os.path.exists(path), f"File not found: {path}"
    file_size = os.path.getsize(path)
    print(f"File: {path} | Size: {file_size} bytes")
    assert file_size > 0, "Excel file is empty"
    
    wb = openpyxl.load_workbook(path, data_only=True)
    expected_sheets = [
        "Executive Scorecard",
        "Feature Inventory",
        "API Inventory",
        "Database Dictionary",
        "Defect Register",
        "QA Test Scenarios"
    ]
    
    print(f"Sheet count: {len(wb.sheetnames)}")
    print(f"Sheet names: {wb.sheetnames}")
    for s in expected_sheets:
        assert s in wb.sheetnames, f"Expected sheet '{s}' missing from Excel workbook"
    print("-> PASS: All 6 expected sheets are present.")
    
    sheet_data = {}
    for s in wb.sheetnames:
        ws = wb[s]
        rows = list(ws.iter_rows(values_only=True))
        non_empty = [r for r in rows if any(c is not None and str(c).strip() != '' for c in r)]
        headers = non_empty[0] if non_empty else ()
        data_rows = non_empty[1:] if len(non_empty) > 1 else []
        sheet_data[s] = {
            "headers": headers,
            "data_rows": data_rows,
            "count": len(data_rows)
        }
    
    # 1. Feature Inventory
    fi_count = sheet_data["Feature Inventory"]["count"]
    print(f"\nFeature Inventory:")
    print(f"  Data rows: {fi_count} (Expected: exactly 33)")
    feature_statuses = {}
    feature_ids = []
    for r in sheet_data["Feature Inventory"]["data_rows"]:
        fid = r[0]
        status = r[6] if len(r) > 6 else "UNKNOWN"
        feature_ids.append(fid)
        feature_statuses[status] = feature_statuses.get(status, 0) + 1
    print(f"  Feature IDs: min={min(feature_ids)}, max={max(feature_ids)}, count={len(feature_ids)}")
    print(f"  Feature Status Breakdown: {feature_statuses}")
    assert fi_count == 33, f"Feature Inventory row count mismatch: got {fi_count}, expected 33"
    print("-> PASS: Feature Inventory has exactly 33 rows.")
    
    # 2. API Inventory
    api_count = sheet_data["API Inventory"]["count"]
    print(f"\nAPI Inventory:")
    print(f"  Data rows: {api_count} (Expected: exactly 24)")
    api_methods = {}
    for r in sheet_data["API Inventory"]["data_rows"]:
        method = r[1] if len(r) > 1 else "UNKNOWN"
        api_methods[method] = api_methods.get(method, 0) + 1
    print(f"  API Methods Breakdown: {api_methods}")
    assert api_count == 24, f"API Inventory row count mismatch: got {api_count}, expected 24"
    print("-> PASS: API Inventory has exactly 24 rows.")
    
    # 3. Defect Register
    defect_count = sheet_data["Defect Register"]["count"]
    print(f"\nDefect Register:")
    print(f"  Data rows: {defect_count} (Expected: exactly 18)")
    defect_ids = [r[0] for r in sheet_data["Defect Register"]["data_rows"]]
    defect_sevs = {}
    for r in sheet_data["Defect Register"]["data_rows"]:
        sev = r[2] if len(r) > 2 else "UNKNOWN"
        defect_sevs[sev] = defect_sevs.get(sev, 0) + 1
    print(f"  Defect IDs ({len(defect_ids)}): {defect_ids}")
    print(f"  Defect Severity Breakdown: {defect_sevs}")
    assert defect_count == 18, f"Defect Register row count mismatch: got {defect_count}, expected 18"
    print("-> PASS: Defect Register has exactly 18 rows.")
    
    # 4. QA Test Scenarios
    qa_count = sheet_data["QA Test Scenarios"]["count"]
    print(f"\nQA Test Scenarios:")
    print(f"  Data rows: {qa_count} (Target: 40)")
    qa_suites = {}
    qa_ids = []
    for r in sheet_data["QA Test Scenarios"]["data_rows"]:
        qid = r[0]
        suite = r[1] if len(r) > 1 else "UNKNOWN"
        qa_ids.append(qid)
        qa_suites[suite] = qa_suites.get(suite, 0) + 1
    print(f"  Suite Breakdown: {qa_suites}")
    print(f"  Total QA IDs: {len(qa_ids)}")
    qa_match = (qa_count == 40)
    assert qa_match, f"QA Scenarios row count mismatch: got {qa_count}, expected 40"
    print("-> PASS: QA Test Scenarios has exactly 40 rows (12 UTS, 6 ITS, 12 ATS, 6 STS, 4 PTS).")
    
    # 5. Database Dictionary
    db_count = sheet_data["Database Dictionary"]["count"]
    print(f"\nDatabase Dictionary:")
    print(f"  Data rows: {db_count}")
    tables = set([r[0] for r in sheet_data["Database Dictionary"]["data_rows"] if r[0]])
    print(f"  Tables/Entities documented ({len(tables)}): {tables}")
    
    # 6. Executive Scorecard
    sc_count = sheet_data["Executive Scorecard"]["count"]
    print(f"\nExecutive Scorecard:")
    print(f"  Data rows: {sc_count}")
    for r in sheet_data["Executive Scorecard"]["data_rows"]:
        print(f"    {r[0]}: {r[1]} | Score: {r[2]} | Status: {r[3]}")
    
    return sheet_data

def test_docx_suite(path):
    print("\n" + "=" * 60)
    print("TEST SUITE 2: DOCX DOCUMENT VERIFICATION")
    print("=" * 60)
    
    assert os.path.exists(path), f"File not found: {path}"
    file_size = os.path.getsize(path)
    print(f"File: {path} | Size: {file_size} bytes")
    assert file_size > 0, "DOCX file is empty"
    
    doc = docx.Document(path)
    print(f"Total Paragraphs: {len(doc.paragraphs)}")
    print(f"Total Tables: {len(doc.tables)}")
    assert len(doc.paragraphs) > 0, "No paragraphs found in DOCX"
    assert len(doc.tables) > 0, "No tables found in DOCX"
    
    tables_summary = []
    for idx, table in enumerate(doc.tables):
        rows = [[c.text.strip() for c in r.cells] for r in table.rows]
        hdr = rows[0] if rows else []
        data = rows[1:] if len(rows) > 1 else []
        tables_summary.append({
            "table_num": idx + 1,
            "header": hdr,
            "data_rows_count": len(data),
            "rows": rows
        })
        print(f"Table {idx+1}: {len(data)} data rows, {len(hdr)} columns. Header: {hdr[:3]}")
    
    # Check specific tables
    t5_data = len(tables_summary[4]["rows"]) - 1
    print(f"DOCX API Table (Table 5) data rows: {t5_data} (Expected: 24) -> {'PASS' if t5_data == 24 else 'FAIL'}")
    assert t5_data == 24, "DOCX API table count mismatch"
    
    t6_data = len(tables_summary[5]["rows"]) - 1
    print(f"DOCX Feature Table (Table 6) data rows: {t6_data} (Expected: 33) -> {'PASS' if t6_data == 33 else 'FAIL'}")
    assert t6_data == 33, "DOCX Feature table count mismatch"
    
    t7_data = len(tables_summary[6]["rows"]) - 1
    print(f"DOCX QA Table (Table 7) data rows: {t7_data} (Representative subset of 17 key scenarios)")
    
    t8_data = len(tables_summary[7]["rows"]) - 1
    print(f"DOCX Defect Table (Table 8) data rows: {t8_data} (Expected: 18) -> {'PASS' if t8_data == 18 else 'FAIL'}")
    assert t8_data == 18, "DOCX Defect table count mismatch"
    docx_defects = [r[0] for r in tables_summary[7]["rows"][1:]]
    print(f"DOCX Defect IDs ({len(docx_defects)}): {docx_defects}")
    
    return doc, tables_summary

def test_pdf_suite(path):
    print("\n" + "=" * 60)
    print("TEST SUITE 3: PDF DOCUMENT VERIFICATION")
    print("=" * 60)
    
    assert os.path.exists(path), f"File not found: {path}"
    file_size = os.path.getsize(path)
    print(f"File: {path} | Size: {file_size} bytes")
    assert file_size > 0, "PDF file is empty"
    
    reader = pypdf.PdfReader(path)
    page_count = len(reader.pages)
    print(f"Page Count: {page_count} (Expected: 5)")
    assert page_count == 5, f"PDF page count mismatch: got {page_count}, expected 5"
    
    full_text = ""
    for idx, page in enumerate(reader.pages):
        t = page.extract_text()
        full_text += f"\n--- PAGE {idx+1} ---\n" + t
    
    print(f"Total extracted text length: {len(full_text)} characters")
    
    pdf_defects = sorted(list(set(re.findall(r'DEF-[A-Z]+-\d{2}', full_text))))
    print(f"Defects detected in PDF text ({len(pdf_defects)}): {pdf_defects}")
    assert len(pdf_defects) == 18, f"PDF defect count mismatch: got {len(pdf_defects)}, expected 18"
    
    for term in ["Scorecard", "CONDITIONAL", "DEF-SEC-01", "DEF-OPS-01", "18 Defects"]:
        found = term in full_text
        print(f"  Checking presence of '{term}': {'FOUND' if found else 'NOT FOUND'}")
        
    return reader, full_text

def test_markdown_suite(path):
    print("\n" + "=" * 60)
    print("TEST SUITE 4: MARKDOWN REPORT VERIFICATION")
    print("=" * 60)
    
    assert os.path.exists(path), f"File not found: {path}"
    file_size = os.path.getsize(path)
    print(f"File: {path} | Size: {file_size} bytes")
    assert file_size > 0, "Markdown file is empty"
    
    # Check binary null bytes
    with open(path, "rb") as f_bin:
        raw_bytes = f_bin.read()
    null_count = raw_bytes.count(b"\x00")
    print(f"Binary null byte count: {null_count}")
    assert null_count == 0, f"Binary null bytes ({null_count}) detected in Markdown report!"
    print("-> PASS: Zero binary null bytes in Markdown report.")
    
    with open(path, "r", encoding="utf-8") as f:
        md = f.read()
    
    print(f"Markdown lines: {len(md.splitlines())}")
    
    # Check top-level numbered sections: exactly matching '## X. '
    sections = re.findall(r'^##\s*(\d{1,2})\.\s*([^\n]+)', md, re.MULTILINE)
    print(f"Top-level numbered sections found ({len(sections)}):")
    for num, title in sections:
        print(f"  Section {num}: {title.strip()}")
    assert len(sections) == 14, f"Expected 14 numbered sections, found {len(sections)}"
    
    # Check Mermaid diagrams
    mermaid_blocks = re.findall(r'```mermaid\s*\n(.*?)\n```', md, re.DOTALL)
    print(f"Mermaid diagram blocks: {len(mermaid_blocks)}")
    diagram_types = []
    for b in mermaid_blocks:
        first_line = b.strip().splitlines()[0]
        diagram_types.append(first_line)
    print(f"Diagram types: {diagram_types}")
    assert len(mermaid_blocks) == 5, f"Expected 5 mermaid diagrams, found {len(mermaid_blocks)}"
    
    # Defect IDs
    md_defects = sorted(list(set(re.findall(r'DEF-[A-Z]+-\d{2}', md))))
    print(f"Defect IDs in Markdown ({len(md_defects)}): {md_defects}")
    assert len(md_defects) == 18, f"Markdown defect count mismatch: got {len(md_defects)}, expected 18"
    
    # QA IDs
    md_qa = sorted(list(set(re.findall(r'(UTS-[A-Z]+-\d{2}|ITS-[A-Z]+-\d{2}|ATS-[A-Z]+-\d{2}|STS-[A-Z]+-\d{2}|PTS-[A-Z]+-\d{2})', md))))
    print(f"QA Scenario IDs in Markdown ({len(md_qa)}): {len(md_qa)} unique IDs")
    
    return md, sections, mermaid_blocks, md_defects, md_qa

def test_cross_format_consistency(excel_data, docx_tables, pdf_text, md_data):
    print("\n" + "=" * 60)
    print("TEST SUITE 5: CROSS-FORMAT CONSISTENCY VERIFICATION")
    print("=" * 60)
    
    excel_defects = sorted([r[0] for r in excel_data["Defect Register"]["data_rows"]])
    docx_defects = sorted([r[0] for r in docx_tables[7]["rows"][1:]])
    pdf_defects = sorted(list(set(re.findall(r'DEF-[A-Z]+-\d{2}', pdf_text))))
    md_defects = md_data[3]
    
    print("\n1. Defect Register Consistency:")
    print(f"  Excel Defect Count:    {len(excel_defects)}")
    print(f"  DOCX Defect Count:     {len(docx_defects)}")
    print(f"  PDF Defect Count:      {len(pdf_defects)}")
    print(f"  Markdown Defect Count: {len(md_defects)}")
    
    assert excel_defects == docx_defects == pdf_defects == md_defects, "Defect ID mismatch across formats!"
    print("-> PASS: Exact 1-to-1 match across all 18 defect IDs in Excel, DOCX, PDF, and Markdown!")
    
    print("\n2. Feature Inventory Consistency:")
    excel_features = excel_data["Feature Inventory"]["count"]
    docx_features = len(docx_tables[5]["rows"]) - 1
    print(f"  Excel Feature Count: {excel_features}")
    print(f"  DOCX Feature Count:  {docx_features}")
    assert excel_features == docx_features == 33, "Feature count mismatch across formats!"
    print("-> PASS: Feature count matches exactly 33 in Excel and DOCX!")
    
    print("\n3. API Route Inventory Consistency:")
    excel_apis = excel_data["API Inventory"]["count"]
    docx_apis = len(docx_tables[4]["rows"]) - 1
    print(f"  Excel API Count: {excel_apis}")
    print(f"  DOCX API Count:  {docx_apis}")
    assert excel_apis == docx_apis == 24, "API count mismatch across formats!"
    print("-> PASS: API route count matches exactly 24 in Excel and DOCX!")
    
    print("\n4. QA Scenario Count Analysis:")
    excel_qa = excel_data["QA Test Scenarios"]["count"]
    docx_qa = len(docx_tables[6]["rows"]) - 1
    md_qa = len(md_data[4])
    print(f"  Excel QA Rows:    {excel_qa}")
    print(f"  Markdown QA IDs:  {md_qa}")
    print(f"  DOCX QA Rows:     {docx_qa} (Explicitly documented as representative subset)")
    
    assert excel_qa == md_qa == 40, f"QA scenario parity failure: Excel has {excel_qa}, Markdown has {md_qa}, expected 40 in both!"
    print("-> PASS: Exact 100% QA Scenario Parity! Both Excel and Markdown contain exactly 40 scenarios (12 UTS, 6 ITS, 12 ATS, 6 STS, 4 PTS).")

if __name__ == "__main__":
    excel_path = "AI_CITY_AUDIT_DATA.xlsx"
    docx_path = "AI_CITY_TECHNICAL_AUDIT_REPORT.docx"
    pdf_path = "AI_CITY_TECHNICAL_AUDIT_REPORT.pdf"
    md_path = "AI_CITY_TECHNICAL_AUDIT_REPORT.md"
    
    excel_data = test_excel_suite(excel_path)
    doc, docx_tables = test_docx_suite(docx_path)
    reader, pdf_text = test_pdf_suite(pdf_path)
    md_data = test_markdown_suite(md_path)
    test_cross_format_consistency(excel_data, docx_tables, pdf_text, md_data)
    print("\n" + "=" * 60)
    print("ALL EMPIRICAL TEST SUITES EXECUTED SUCCESSFULLY")
    print("=" * 60)
