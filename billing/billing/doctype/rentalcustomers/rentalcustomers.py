# Copyright (c) 2025, Frugal Scientific and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class rentalcustomers(Document):
	pass


@frappe.whitelist()
def new_trig(names):
    
    return "Done"