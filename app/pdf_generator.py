import io
import datetime
from fpdf import FPDF

class MaternalHealthPDF(FPDF):
    def header(self):
        # Header banner
        self.set_fill_color(240, 244, 248)
        self.rect(0, 0, 210, 35, 'F')
        
        # Primary Title
        self.set_font('Arial', 'B', 15)
        self.set_text_color(26, 54, 93) # Deep Blue
        self.cell(0, 10, 'MATERNAL HEALTH RISK ASSESSMENT', 0, 1, 'C')
        
        # Subtitle
        self.set_font('Arial', 'I', 9)
        self.set_text_color(74, 85, 104) # Charcoal
        self.cell(0, 5, 'Early Warning Triage System - Rural Rwanda Support Initiative', 0, 1, 'C')
        self.ln(10)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.set_text_color(160, 174, 192)
        # Page number
        self.cell(0, 10, f'Page {self.page_no()} | Generated on {datetime.datetime.now().strftime("%Y-%m-%d %H:%M")} | System ID: MH-EWS', 0, 0, 'C')

def generate_patient_pdf(report_data: dict, patient_name: str, age: int, village: str, phone: str, gestational_weeks: int) -> bytes:
    """
    Generates a PDF bytes object containing the maternal health assessment details.
    """
    pdf = MaternalHealthPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=15)
    
    # Border box
    pdf.set_draw_color(226, 232, 240)
    pdf.set_line_width(0.5)
    
    # Metadata Block (Patient Info)
    pdf.set_font('Arial', 'B', 11)
    pdf.set_text_color(45, 55, 72)
    pdf.cell(0, 8, 'Patient Details', 0, 1, 'L')
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)
    
    pdf.set_font('Arial', '', 10)
    # Row 1
    pdf.cell(95, 6, f"Patient Name: {patient_name}", 0, 0)
    pdf.cell(95, 6, f"Age: {age} years", 0, 1)
    # Row 2
    pdf.cell(95, 6, f"Village: {village or 'N/A'}", 0, 0)
    pdf.cell(95, 6, f"Phone Number: {phone}", 0, 1)
    # Row 3
    pdf.cell(95, 6, f"Gestational Age: {gestational_weeks} Weeks", 0, 0)
    pdf.cell(95, 6, f"Assessment Date: {datetime.datetime.utcnow().strftime('%Y-%m-%d')}", 0, 1)
    pdf.ln(5)

    # Vitals Block
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 8, 'Clinical Measurements (Vitals)', 0, 1, 'L')
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)
    
    systolic = report_data.get('systolic_bp')
    diastolic = report_data.get('diastolic_bp')
    weight = report_data.get('weight')
    
    pdf.set_font('Arial', '', 10)
    bp_val = f"{systolic}/{diastolic} mmHg" if systolic and diastolic else "Not recorded"
    wt_val = f"{weight} kg" if weight else "Not recorded"
    pdf.cell(95, 6, f"Blood Pressure: {bp_val}", 0, 0)
    pdf.cell(95, 6, f"Weight: {wt_val}", 0, 1)
    pdf.ln(5)

    # Risk Triage Status Block
    risk_level = report_data.get('risk_level', 'LOW')
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 8, 'Risk Assessment Results', 0, 1, 'L')
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(3)

    # Set background colors for Risk level indicator
    if risk_level == "HIGH":
        pdf.set_fill_color(254, 226, 226) # Soft red
        pdf.set_text_color(153, 27, 27)  # Dark red
        pdf.set_draw_color(248, 180, 180)
    elif risk_level == "MEDIUM":
        pdf.set_fill_color(254, 243, 199) # Soft orange/yellow
        pdf.set_text_color(146, 64, 14)   # Dark orange
        pdf.set_draw_color(251, 191, 36)
    else:
        pdf.set_fill_color(220, 252, 231) # Soft green
        pdf.set_text_color(22, 101, 52)   # Dark green
        pdf.set_draw_color(134, 239, 172)

    pdf.set_font('Arial', 'B', 12)
    # Render colored alert banner
    pdf.cell(0, 10, f"  RISK STATUS: {risk_level}", 1, 1, 'L', fill=True)
    pdf.ln(4)

    # Symptom Details
    pdf.set_text_color(45, 55, 72)
    pdf.set_font('Arial', 'B', 10)
    pdf.cell(0, 6, "Symptom Screening Flags Checked:", 0, 1)
    
    pdf.set_font('Arial', '', 9.5)
    symptoms_list = [
        ("Vaginal Bleeding", report_data.get('bleeding')),
        ("High Fever", report_data.get('fever')),
        ("Severe Headache / Blurred Vision", report_data.get('headache')),
        ("Face / Hands Swelling", report_data.get('swelling')),
        ("Severe Abdominal Pain", report_data.get('abdominal_pain')),
        ("Reduced Fetal Movement", report_data.get('reduced_fetal_movement'))
    ]
    
    for label, present in symptoms_list:
        status_txt = "[ YES ]" if present else "[ NO ]"
        pdf.cell(10, 5, "", 0, 0) # Indent
        pdf.set_font('Arial', 'B' if present else '', 9)
        if present:
            pdf.set_text_color(153, 27, 27)
        else:
            pdf.set_text_color(113, 128, 150)
        pdf.cell(70, 5, label, 0, 0)
        pdf.cell(20, 5, status_txt, 0, 1)
    
    pdf.set_text_color(45, 55, 72)
    pdf.ln(5)

    # System Recommendations Block
    pdf.set_font('Arial', 'B', 11)
    pdf.cell(0, 8, 'Clinical Recommendations', 0, 1, 'L')
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)

    pdf.set_font('Arial', 'B', 9.5)
    pdf.cell(0, 5, 'English Guidance:', 0, 1)
    pdf.set_font('Arial', '', 9.5)
    pdf.multi_cell(0, 5, report_data.get('recommendation_en', ''), 0, 'L')
    pdf.ln(2)

    pdf.set_font('Arial', 'B', 9.5)
    pdf.cell(0, 5, 'Kinyarwanda (Inyanzuro y\'ubuzima):', 0, 1)
    pdf.set_font('Arial', '', 9.5)
    # Replacing non-ascii or special characters in Kinyarwanda translation if necessary
    # (FPDF standard fonts only support Latin-1)
    recomm_rw = report_data.get('recommendation_rw', '').replace('\'', "'")
    pdf.multi_cell(0, 5, recomm_rw, 0, 'L')
    pdf.ln(10)

    # Signature/Verification Section
    pdf.set_y(-55)
    pdf.set_draw_color(203, 213, 224)
    pdf.line(10, pdf.get_y(), 200, pdf.get_y())
    pdf.ln(2)
    pdf.set_font('Arial', 'B', 9)
    pdf.cell(95, 5, "Community Health Worker Verification", 0, 0, 'L')
    pdf.cell(95, 5, "Health Post Nurse Verification", 0, 1, 'R')
    pdf.ln(10)
    pdf.cell(95, 5, "Signature: ______________________", 0, 0, 'L')
    pdf.cell(95, 5, "Signature: ______________________", 0, 1, 'R')

    # Return bytes
    return pdf.output()
