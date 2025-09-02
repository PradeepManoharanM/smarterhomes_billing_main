# Copyright (c) 2025, Frugal Scientific and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document
import requests

from billing.utils.invoicer.sendemail import sendMail


class RentalInvoices(Document):
	pass


@frappe.whitelist()
def approve_action(docname):
    # doc = frappe.get_doc("RentalInvoices", docname)
    frappe.msgprint(f"Custom approval logic executed for {docname}")
    return True
    

@frappe.whitelist()
def calculate_invoice(doc):
    doc = frappe._dict(frappe.parse_json(doc))
    
    frappe.msgprint(_("Invoice recalculated for: {0}").format(doc.get("name")))

@frappe.whitelist()
def approve_and_email_invoice(doc):
    doc = frappe._dict(frappe.parse_json(doc))
    
    frappe.msgprint(_("Invoice approved and email sent for: {0}").format(doc.get("name")))

@frappe.whitelist()
def view_invoice(doc):
    doc = frappe._dict(frappe.parse_json(doc))
    
    frappe.msgprint(_("Viewing invoice: {0}").format(doc.get("name")))



@frappe.whitelist()
def call_recalculate_invoice(property_name, date):
    frappe.log_error("Reached call_recalculate_invoice", "DEBUG")

    # ✅ Construct email
    sender = sendMail()
    to_list = ["tittoanmathews@gmail.com"]   # Replace with dynamic recipients if needed
    cc_list = ["tittoamathews@gmail.com"]
    subject = f"Invoice Recalculation for {property_name} - {date}"

    # Example: use a static HTML template in your app (like mail.html)
    html_file = "/home/frappe/frappe-bench/apps/billing/billing/utils/invoicer/mail.html"
    with open(html_file) as hf:
        html = hf.read()

    # ✅ Send email
    sender.send(to_list, subject, html, cc_list)

    return {
        "status": "success",
        "message": f"Email sent to {', '.join(to_list)} with subject '{subject}'"
    }

