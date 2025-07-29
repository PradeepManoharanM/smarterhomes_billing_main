# Copyright (c) 2025, Frugal Scientific and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.model.document import Document


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