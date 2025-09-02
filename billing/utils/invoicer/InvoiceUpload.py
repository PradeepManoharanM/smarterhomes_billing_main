import json

from frappeclient import FrappeClient
import csv
import sys, os
from datetime import datetime
frappe = None
from calendar import  monthrange

def initFrappe():
	global frappe
	host="https://propmandev.wateron.cc/"
	frappe = FrappeClient(host)
	frappe.authenticate('f04a65911709227', '910c13234ede163')

lastdoc=[]
def insertDoc(doc):
	# lastdoc.append(doc)
	# return
	res = {}
	for attempts in (1,2,3):
		if attempts > 3:
			print(str(doc) + '\n' + str(res))
			return res
		res = frappe.insert(doc)
		if res['ok']:
			return res

def toFloat(floatStr):
	return float(floatStr.strip().replace(',',''))

# Fields in csv: # Property	City ContractType WaterType	MeterCount MeterType
# OriginalRate BillingStart Appr Interval Contract Period	Appr Rate

# Fields in inv_property and inv_meter_batch
#   property_name, address, city, contact_name, phone, email, email_cc, gst, late_interest
#   orig_rent, start_date, appr_rate, appr_period, meter_count, contract_period

def uploadProps(csvfile):
	proplist = []
	fp = open(csvfile)
	crecs = csv.DictReader(fp)
	for crec in crecs:
		if crec['Project Name'] not in proplist:
			insertDoc( { 'doctype' : 'Invoice Customers',
				"property_name": crec['Project Name'].strip(),
				"city": crec['City'],
					   })
			proplist.append(crec['Project Name'])

		# TODO: rest of records in inv_property to be filled

	fp.close()


def uploadContracts(csvfile):

	fp = open(csvfile)
	crecs = csv.DictReader(fp)
	for crec in crecs:
		insertDoc( { 'doctype' : 'inv_meter_batch',
				"property_name": crec['Property'].strip(),
				"orig_rent": crec['OriginalRate'],
				"start_date": datetime
				   .strptime(crec['BillingStart'],'%d-%b-%Y')
				   .strftime('%Y-%m-%d') ,
				"appr_rate": crec['Appr Rate'],
				"appr_period": crec['Appr Interval'],
				"meter_count": crec['MeterCount'],
				"contract_period": crec['Contract Period'],

					 })
	fp.close()

def fetchContract(propName):
	return frappe.get_list('inv_meter_batch', filters={'property_name': propName})['response']

def fetchInvoice(propName, invDate):
	resp = frappe.get_list('Inv_rental', filters={'property_name': propName, 'inv_date': invDate})['response']
	if len(resp):
		return resp[0]
	return None

# Retuns lists of rents and metercounts
def appreciatedRents(contract, prevInv, invDate):
	meterCounts = []
	rents = []
	rates = []
	prevRates = [float(x) for x in prevInv['rates'].split(',')] if prevInv else []
	for indx in range(len(contract)):
		batch = contract[indx]
		nMeters = int(batch['meter_count'])
		origRent = float(batch['orig_rent'])
		apprPeriod = int(batch['appr_period'])
		apprRate = float(batch['appr_rate'])
		[startYear, startMonth, startDay] = [int(x) for x in batch['start_date'].split('-')]
		[invYear, invMonth, invDay] = [int(x) for x in invDate.split('-')]
		monthDiff = (invYear - startYear) * 12 + invMonth - startMonth
		if monthDiff <= 0:  # billing not started
			continue
		rent = 0
		currentRentRate = origRent
		nApprPeriods = 0
		if monthDiff == 1 and startDay != 1:  # Partial month
			nDays = monthrange(startYear, startMonth)[1]  # Number of billable days
			rent = nMeters * origRent * (nDays - startDay + 1) / nDays  # prorate for number of days
		else:
			currentRentRate = prevRates[indx] if len(prevRates) > indx else origRent
			nApprPeriods = monthDiff / apprPeriod
			if nApprPeriods == int(nApprPeriods):
				currentRentRate *=  (1 + apprRate / 100.0)
			rent = nMeters * currentRentRate

		rates.append(round(currentRentRate,2))
		rents.append(round(rent,2))
		meterCounts.append(nMeters)

	return meterCounts,rents,rates

# Inv number format: KA/SL/0001/25-26
def newInvoiceNumber():
	invn = ''
	with open("lastinvoicenumber.txt") as inf:
		invn = inf.readline().strip().split('/')
	invn[2] = str(int(invn[2]) + 1)
	newInvn = '/'.join(invn)
	with open("lastinvoicenumber.txt","w") as inf:
		inf.write(newInvn + '\n')
	return newInvn


# Upload invoices of a month from XL sheet. Relevant fields:
# Project Name,City,Invoice Number,Meter Count,Service Rate,Previous Due,
# Amount,GST,Late Fee,Payable,Received,TDS,Discount,Total Due,

# Feilds of doctype inv_rental: inv_date, property_name, meter_count, rates,
# monthscharge, acct_number,inv_number, prev_balance, sgst,  cgst, discount,
# late_fee, total_payable, #inv_status, amt_rcvd, tds
def uploadInvoice(sheet, invDate):
	docs = []
	fp = open(sheet)
	crecs = csv.DictReader(fp)
	propindx = 0
	for crec in crecs:
		propName = crec['Project Name'].strip()
		if propName == '':		# Extra line for additional meters
			doc = docs[-1]		# Last property
			doc['meter_count'] = doc['meter_count'] + ',' + crec['Meter Count']
			doc['rates'] = doc['rates'] + ',' + crec['Service Rate']
		else:
			docs.append( {
				'doctype': 'Inv_rental',
				'inv_date': invDate,
				'property_name': propName,
				'inv_number': crec['Invoice Number'],
				'prev_balance': crec['Previous Due'],
				'monthscharge': crec['Amount'],
				'sgst': toFloat(crec['GST'])/2,
				'cgst': toFloat(crec['GST'])/2,
				'discount': crec['Discount'],
				'late_fee': crec['Late Fee'],
				'total_payable': crec['Payable'],
				'amt_rcvd': crec['Received'],
				'tds': crec['TDS'],
				'total_due': crec['Total Due'],
				'meter_count': crec['Meter Count'],
				'rates': crec['Service Rate'],
				'inv_status': 'Generated',
			})

	for doc in docs:
		insertDoc(doc)

	return docs
	fp = open('/tmp/FebInv.csv','wt', newline='')
	fields = ['property_name', 'inv_number', 'meter_count', 'rates','monthscharge', 'prev_balance', 'prev_balance', 'discount',
					'late_fee', 'total_payable', 'amt_rcvd', 'tds', 'total_due']
	writer = csv.DictWriter(fp, restval='', fieldnames= fields, extrasaction='ignore')
	writer.writeheader()
	for doc in docs:
		writer.writerow(doc)
	fp.close()
	return docs

# Create invoice for the given month, considering previous month's invoice
# Date format 'yyyy-mm-dd'
# If prev inv is available, it is used for rate and appreciation calcs, else taken from contrct
# Assumption: the meterlist of a property in prev invoice and contract are same
def generateInvoice(propName, invDate):

	# Get contract
	contract = fetchContract(propName)
	if len(contract) == 0:
		print("Contract for Propety " + propName + " not found")
		return
	[invYear, invMonth, invDay] = [int(x) for x in invDate.split('-')]
	prevMonth = "%04d-%02d-%02d" % ((invYear - 1, 12, 1) if invMonth == 1 else (invYear, invMonth -1, 1))

	prevInv = fetchInvoice(propName, prevMonth)

	meterCounts,rents,rates = appreciatedRents(contract, prevInv, invDate)

	# Calculate this month's charge
	totalRent = 0
	for r in rents:
		totalRent += r

	prev_balance = float(prevInv['total_due']) if prevInv else 0

	GST = 18.0/100
	SGST = 9.0/100
	CGST = 9.0/100
	latefee = prev_balance * 2.5/100
	doc = {
		'doctype': 'Inv_rental',
		'inv_date': invDate,
		'property_name': propName,
		'inv_number': newInvoiceNumber(),
		'monthscharge': totalRent ,
		'prev_balance': prev_balance,
		'sgst': totalRent * SGST,
		'cgst': totalRent * CGST,
		'late_fee': latefee,
		'total_payable': totalRent * (1+GST) + prev_balance + latefee,
		'inv_status': 'Generated',
		'meter_count': ','.join(map(str, meterCounts)),
		'rates': ','.join(map(str, rates)),
	}
	return doc

def generateAllInvoices(invDate):
	proplist = frappe.get_list('inv_property', fields=['property_name'], limit_page_length=10000)['response']
	fp = open('/tmp/MarInvGenerated.csv','wt', newline='')
	fields = ['property_name', 'inv_number', 'monthscharge', 'prev_balance', 'sgst', 'cgst', 'discount',
			  'late_fee', 'total_payable', 'inv_status', 'meter_count', 'rates']
	writer = csv.DictWriter(fp, restval='', fieldnames= fields, extrasaction='ignore')
	writer.writeheader()
	for prop in proplist:
		propName = prop['property_name']
		inv = generateInvoice(propName, invDate)
		insertDoc(inv)
		writer.writerow(inv)
	fp.close()

# Compare manual and auto generated invoices
def compareInvoices(csvManual, csvAuto):
	mprops = {}
	aprops = {}
	lastmprop = ''
	with open(csvManual) as fp:
		crecs = csv.DictReader(fp)
		for rec in crecs:
			prop =  rec['Project Name']
			if prop == '':		# Additional lines
				mprops[lastmprop]['Meter Count'] += ',' + rec['Meter Count']
				mprops[lastmprop]['Service Rate'] += ',' + rec['Service Rate']
			else:
				mprops[prop] = rec
				lastmprop = prop

	with open(csvAuto) as fp:
		crecs = csv.DictReader(fp)
		for rec in crecs:
			prop = rec['Property']
			aprops[prop] = rec

	mfields = ['Meter Count', 'Service Rate', 'Previous Due',
			   'Amount', 'Late Fee', 'Payable', 'Discount']
	afields = ['Meter Count', 'Current Rates', 'Previous Balance',
			   "This Month's Charge", 'Late Fee', 'Total Payable','Discount']

	print ("Property," + '"' + '","'.join(afields) + '"')
	for m in mprops:
		if m not in aprops:
			print (m + " not found in auto invoice", file=sys.stderr)
			continue
		a = aprops[m]

		line = '"' + m + '"'
		for i in range(len(mfields)):
			line += ',"' + mprops[m][mfields[i]] +'"'
			line += ',"' + aprops[m][afields[i]] +'"'
		print (line)

def validateContracts(sheet):
	conts = frappe.get_list('inv_meter_batch')['response']		# All contracts


# Compare prop list from invoice csv with: Frappe meter batches list
def validatePropLists(sheet):
	frappeList = frappe.get_list('inv_property', fields=['property_name'], limit_page_length=10000)['response']
	fprops = [ p['property_name'] for p in frappeList]
	with open(sheet) as fp:
		crecs = csv.DictReader(fp)
		precs = [ rec['Project Name'].strip() for rec in crecs]
	
	print("Cheking Props of Sheet in frappe")
	for rec in precs:
		if len(rec) > 0 and rec not in fprops:
			print ("'"+rec +"'")
	print("Cheking Props of Frappe in Sheet")
	for rec in fprops:
		if rec not in precs:
			print("'"+rec +"'")

usage = '''
	uploadprops <contracts.csv>
	uploadInvoices <months-invoice.csv> <month yyyy-mm-dd>
	generateinvoice <property-name> <month yyyy-mm-dd>
'''
if __name__ == '__main__':
	initFrappe()

	print('Uploading props')
	uploadProps('MasteApril.csv')
	# uploadContracts('RentalContracts.csv')
	# validatePropLists('Master Invoice sheet.xlsx - Feb 2025.csv')
	# print('Uploading invoice')
	# uploadInvoice('Master Invoice sheet.xlsx - Feb 2025.csv', '2025-02-1')
	# print('Generating invoice')
	# generateAllInvoices('2025-03-01')
	# compareInvoices('Master Invoice sheet.xlsx - Mar 2025.csv', 'MarchInvoicesGenerated.csv')
'''
1. uploadInvoice(): Finalize(add insertDoc())
2. generateInvoice(): Test logic and finalize
3. reGenInvoice(): Recalculate invoice assuming Recd TDS and discount is edited by user
4. createInvoicePdf()
5. Email interface
6. All fetch calls to query RDS


	sys.exit(0)

	if sys.argv[1] == 'uploadprops' and len(sys.argv) == 3:
		uploadProps(sys.argv[2])
	elif sys.argv[1] == 'uploadinvoice' and len(sys.argv) == 4:
		uploadInvoice(sys.argv[2], sys.argv[3] )
	elif sys.argv[1] == 'generateinvoice' and len(sys.argv) == 4:
		generateInvoice(sys.argv[2],sys.argv[3])
	else:
		print(usage)
'''

