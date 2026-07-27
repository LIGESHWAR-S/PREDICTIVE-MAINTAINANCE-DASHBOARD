import io
import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

def generate_dashboard_report(stats: dict, active_alerts: list) -> io.BytesIO:
    """
    Generates a PDF report summarizing the overall dashboard statistics and active alerts.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=15
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=25
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=15,
        spaceAfter=10
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155')
    )

    bold_body_style = ParagraphStyle(
        'BoldBodyCustom',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    story = []
    
    # Title & Metadata
    story.append(Paragraph("Predictive Monitoring System - Dashboard Report", title_style))
    story.append(Paragraph(f"Generated on: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Section: KPI Summary
    story.append(Paragraph("System Health Metrics Summary", section_heading))
    
    # KPI Grid Table
    kpi_data = [
        [
            Paragraph("Metric", bold_body_style), 
            Paragraph("Value", bold_body_style), 
            Paragraph("Status / Details", bold_body_style)
        ],
        [
            Paragraph("Total Monitored Machines", body_style), 
            Paragraph(str(stats.get("total_machines", 0)), body_style), 
            Paragraph("Active assets", body_style)
        ],
        [
            Paragraph("Overall System Health", body_style), 
            Paragraph(f"{stats.get('overall_health', 0.0):.1f}%", body_style), 
            Paragraph("Average health score", body_style)
        ],
        [
            Paragraph("Healthy Machines", body_style), 
            Paragraph(str(stats.get("healthy_machines", 0)), body_style), 
            Paragraph("Status Green", body_style)
        ],
        [
            Paragraph("Warning Machines", body_style), 
            Paragraph(str(stats.get("warning_machines", 0)), body_style), 
            Paragraph("Status Yellow", body_style)
        ],
        [
            Paragraph("Critical Machines", body_style), 
            Paragraph(str(stats.get("critical_machines", 0)), body_style), 
            Paragraph("Status Red", body_style)
        ],
        [
            Paragraph("Predicted Failures Count", body_style), 
            Paragraph(str(stats.get("predicted_failures", 0)), body_style), 
            Paragraph("Failures anticipated in next cycles", body_style)
        ],
        [
            Paragraph("Active Alerts Count", body_style), 
            Paragraph(str(stats.get("active_alerts", 0)), body_style), 
            Paragraph("Unresolved warnings & faults", body_style)
        ],
    ]
    
    kpi_table = Table(kpi_data, colWidths=[200, 100, 220])
    kpi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#0F172A')),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
        ('TOPPADDING', (0, 0), (-1, 0), 8),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0, 1), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
    ]))
    
    story.append(kpi_table)
    story.append(Spacer(1, 20))
    
    # Section: Active Alerts
    story.append(Paragraph("Active Incidents & Alerts Log", section_heading))
    if len(active_alerts) == 0:
        story.append(Paragraph("No active alerts at this time. All machines operating within nominal parameters.", body_style))
    else:
        alert_rows = [
            [
                Paragraph("Machine ID", bold_body_style), 
                Paragraph("Type", bold_body_style), 
                Paragraph("Severity", bold_body_style), 
                Paragraph("Message", bold_body_style), 
                Paragraph("Timestamp", bold_body_style)
            ]
        ]
        for alert in active_alerts[:25]:  # Limit to top 25 alerts
            sev_color = '#DC2626' if alert.get("severity") == 'critical' else '#D97706'
            alert_rows.append([
                Paragraph(alert.get("product_id"), body_style),
                Paragraph(alert.get("type"), body_style),
                Paragraph(f"<font color='{sev_color}'>{alert.get('severity').upper()}</font>", body_style),
                Paragraph(alert.get("message"), body_style),
                Paragraph(alert.get("timestamp").strftime('%Y-%m-%d %H:%M') if isinstance(alert.get("timestamp"), datetime.datetime) else str(alert.get("timestamp")), body_style),
            ])
            
        alerts_table = Table(alert_rows, colWidths=[80, 100, 70, 170, 100])
        alerts_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(alerts_table)
        
    doc.build(story)
    buffer.seek(0)
    return buffer

def generate_machine_report(machine: dict, history: list) -> io.BytesIO:
    """
    Generates a PDF diagnostic report for a specific machine including history.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    
    styles = getSampleStyleSheet()
    
    # Custom Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=24,
        leading=28,
        textColor=colors.HexColor('#1E293B'),
        spaceAfter=10
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        spaceAfter=25
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontSize=16,
        leading=20,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=15,
        spaceAfter=10
    )
    
    body_style = ParagraphStyle(
        'BodyTextCustom',
        parent=styles['Normal'],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor('#334155')
    )

    bold_body_style = ParagraphStyle(
        'BoldBodyCustom',
        parent=body_style,
        fontName='Helvetica-Bold'
    )
    
    story = []
    
    # Title & Metadata
    product_id = machine.get("product_id")
    story.append(Paragraph(f"Asset Diagnostics Report: {product_id}", title_style))
    story.append(Paragraph(f"Generated on: {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}", subtitle_style))
    story.append(Spacer(1, 10))
    
    # Section: Machine Details
    story.append(Paragraph("Machine Configuration & Current Status", section_heading))
    
    status = "Healthy"
    status_color = '#16A34A'
    if machine.get("health_score") < 40:
        status = "Critical"
        status_color = '#DC2626'
    elif machine.get("health_score") < 80:
        status = "Warning"
        status_color = '#D97706'
        
    latest = machine.get("latest_reading") or {}
    
    detail_data = [
        [Paragraph("Asset ID", bold_body_style), Paragraph(product_id, body_style), Paragraph("Machine Type", bold_body_style), Paragraph(machine.get("type"), body_style)],
        [Paragraph("Health Score", bold_body_style), Paragraph(f"{machine.get('health_score'):.1f}%", body_style), Paragraph("Status", bold_body_style), Paragraph(f"<font color='{status_color}'>{status.upper()}</font>", body_style)],
        [Paragraph("Failure Probability", bold_body_style), Paragraph(f"{machine.get('failure_probability') * 100:.1f}%", body_style), Paragraph("Predicted Failure Type", bold_body_style), Paragraph(machine.get("predicted_failure_type"), body_style)],
        [Paragraph("Remaining Useful Life", bold_body_style), Paragraph(f"{machine.get('estimated_rul'):.0f} min", body_style), Paragraph("Last Update", bold_body_style), Paragraph(machine.get("last_updated").strftime('%Y-%m-%d %H:%M:%S UTC') if isinstance(machine.get("last_updated"), datetime.datetime) else str(machine.get("last_updated")), body_style)],
    ]
    
    detail_table = Table(detail_data, colWidths=[120, 140, 120, 140])
    detail_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F8FAFC')),
        ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#F8FAFC')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(detail_table)
    story.append(Spacer(1, 15))
    
    # Section: Recommendations
    story.append(Paragraph("Maintenance & Operations Recommendation", section_heading))
    story.append(Paragraph(machine.get("maintenance_recommendation"), body_style))
    story.append(Spacer(1, 15))
    
    # Section: Current Sensors Values
    story.append(Paragraph("Current Sensor Values", section_heading))
    sensor_data = [
        [Paragraph("Sensor Parameter", bold_body_style), Paragraph("Current Value", bold_body_style), Paragraph("Nominal Range (Reference)", bold_body_style)],
        [Paragraph("Air Temperature", body_style), Paragraph(f"{latest.get('air_temp', 0):.1f} K", body_style), Paragraph("295 K - 305 K", body_style)],
        [Paragraph("Process Temperature", body_style), Paragraph(f"{latest.get('process_temp', 0):.1f} K", body_style), Paragraph("305 K - 315 K", body_style)],
        [Paragraph("Rotational Speed", body_style), Paragraph(f"{latest.get('rotational_speed', 0):.0f} rpm", body_style), Paragraph("1200 rpm - 1800 rpm", body_style)],
        [Paragraph("Torque", body_style), Paragraph(f"{latest.get('torque', 0):.1f} Nm", body_style), Paragraph("20 Nm - 60 Nm", body_style)],
        [Paragraph("Tool Wear", body_style), Paragraph(f"{latest.get('tool_wear', 0):.0f} min", body_style), Paragraph("&lt; 200 min", body_style)],
    ]
    sensor_table = Table(sensor_data, colWidths=[200, 150, 170])
    sensor_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(sensor_table)
    story.append(Spacer(1, 20))
    
    # Section: History (Last 10 records)
    story.append(Paragraph("Recent Sensor History", section_heading))
    if len(history) == 0:
        story.append(Paragraph("No historical records available for this machine.", body_style))
    else:
        hist_rows = [
            [
                Paragraph("Timestamp", bold_body_style), 
                Paragraph("Air Temp (K)", bold_body_style), 
                Paragraph("Rotational Speed (rpm)", bold_body_style), 
                Paragraph("Torque (Nm)", bold_body_style), 
                Paragraph("Tool Wear (min)", bold_body_style),
                Paragraph("Failure Prob", bold_body_style)
            ]
        ]
        # Grab up to last 10 readings
        for h in history[:10]:
            ts_str = h.timestamp.strftime('%Y-%m-%d %H:%M') if isinstance(h.timestamp, datetime.datetime) else str(h.timestamp)
            hist_rows.append([
                Paragraph(ts_str, body_style),
                Paragraph(f"{h.air_temp:.1f}", body_style),
                Paragraph(f"{h.rotational_speed:.0f}", body_style),
                Paragraph(f"{h.torque:.1f}", body_style),
                Paragraph(f"{h.tool_wear:.0f}", body_style),
                Paragraph(f"{h.failure_prob * 100:.1f}%", body_style),
            ])
            
        hist_table = Table(hist_rows, colWidths=[100, 80, 110, 80, 80, 70])
        hist_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F1F5F9')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        story.append(hist_table)
        
    doc.build(story)
    buffer.seek(0)
    return buffer
