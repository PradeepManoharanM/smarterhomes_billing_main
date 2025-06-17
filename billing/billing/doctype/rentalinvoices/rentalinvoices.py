# Copyright (c) 2025, Frugal Scientific and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class RentalInvoices(Document):
	pass


@frappe.whitelist()
def approve_action(docname):
    # doc = frappe.get_doc("RentalInvoices", docname)
    frappe.msgprint(f"Custom approval logic executed for {docname}")
    return True
