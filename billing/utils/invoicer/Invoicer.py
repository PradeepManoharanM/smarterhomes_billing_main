import json
import time

from frappeclient import FrappeClient
import csv
import sys, os
from datetime import datetime, timedelta
frappe = None
from calendar import  monthrange
import mysql.connector

rdsServer = "smdb.c59hcehledvt.ap-south-1.rds.amazonaws.com"
# rdsServer = "smdb-staging.c59hcehledvt.ap-south-1.rds.amazonaws.com"
rtfTemplate = "./InvoiceTemplate.pdf"
invCSV = []	# Invoice CSV records from file
monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'June', 'July', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec']
def initFrappe():
	global frappe
	host="https://propmandev.wateron.cc/"
	frappe = FrappeClient(host)
	frappe.authenticate('f04a65911709227', '910c13234ede163')

def insertDoc(doc):
	res = {}
	for attempts in (1,2,3,4):
		if attempts > 3:
			print(str(doc) + '\n' + str(res))
			return res
		res = frappe.insert(doc)
		if res['ok']:
			return res

def insertManyDocs(docs):
	res = {}
	for attempts in (1,2,3):
		if attempts > 3:
			print("Insert Many - Failed: " + str(res))
			return res
		res = frappe.insert_many(docs)
		if res['ok']:
			return res

def toFloat(floatStr):
	return float(floatStr.strip().replace(',',''))
def fetchContract(propName):
	filters = None if propName == 'All' else {'property_name': propName}
	return frappe.get_list('RentalContracts', filters=filters)['response']

def fetchInvoice(propName, invDate):
	resp = frappe.get_list('RentalInvoices', filters={'property_name': propName, 'inv_date': invDate})['response']
	if len(resp):
		return resp[0]
	return None

# Search list of dict. Return index if found, else -1
def dictSearch(listName, keyName, value):
        for rec in listName:
                if keyName in rec and rec[keyName] == value:
                        return rec
        return {}

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

		currentRentRate = origRent
		if monthDiff == 1 and startDay != 1:  # Partial month
			nDays = monthrange(startYear, startMonth)[1]  # Number of billable days
			rent = nMeters * origRent * (nDays - startDay + 1) / nDays  # prorate for number of days
			print ("Partial month for " + contract[indx]['property_name'])
		else:
			currentRentRate = prevRates[indx] if len(prevRates) > indx else origRent
			nApprPeriods = monthDiff / apprPeriod
			if nApprPeriods == int(nApprPeriods):			# Appreciate the rent
				currentRentRate *=  (1 + apprRate / 100.0)
				print ("Appreciation for  " + contract[indx]['property_name'])

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
	SGST = GST / 2
	CGST = GST / 2
	latefee = 0 if prev_balance <= 0 else prev_balance * 2.5/100
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

# Returns first occurance of {{....}}, and its pos
def getCanddate(s, startpos):
	for indx in range(startpos,len(s)):
		if s[indx:indx+2] == '{{':
			for ri in range (indx+3, indx+20):
				if s[ri:ri + 2] == '}}':
					return s[indx+2:ri-1],indx

def substituteInvoice (inv, templateFile):
	invDt = datetime.strptime( inv['inv_date'], "%Y-%m-%d")
	lastMonth = invDt.replace(day=1) - timedelta(days=1)
	with open (templateFile) as tfile:
		t = tfile.read()

		(t.replace('<<propname>>', inv['prperty_name'])
			.replace('<<address>>',inv['address'].replace('\n', '\\line '))
			.replace('<<account>>', inv['acct_number'])
			.replace('<<invnumber>>', inv['inv_number'])
			.replace('<<invdate>>', invDt.strftime("%d-%m-%Y"))
			.replace('<<billperiod>>', lastMonth.strftime("%m %Y"))
			.replace('<<prevbalance>>', inv['prev_balance'])
			.replace('<<amount>>', inv['monthscharge'])
			.replace('<<latefee>>', inv['late_fee'])
			.replace('<<duedate>>',invDt.replace(day=15).strftime("%d-%m-%Y"))
			.replace('<<payable>>', inv['payable'])
			.replace('<<sgst>>', inv['sgst'])
			.replace('<<cgst>>', inv['cgst'])
		 )
		mcount = [m for m in inv['meter_count'].split(',')]
		rates = [r for r in inv['rates'].split(',')]
		planLine = typeLine = metersLine = ratesLine = rentsLine = ''
		sepmark = '\\line ' if templateFile.endswith('.rtf') else '<br>'
		for indx in range(mcount):
			rent = int(mcount[indx]) * float(rates[indx])
			sep = sepmark if indx > 0 else ''
			metersLine += sep + mcount[indx]
			ratesLine += sep + rates[indx]
			rentsLine += sep + "%.2f" % rent
			planLine = ''		# TODO
			typeLine = ''		# TODO



def generateAllInvoices(invDate):
	proplist = frappe.get_list('RentalCustomers', fields=['property_name'], limit_page_length=10000)['response']
	fp = open('/tmp/MayInvGenerated.csv','wt', newline='')
	fields = ['property_name', 'inv_number', 'monthscharge', 'prev_balance', 'sgst', 'cgst', 'discount',
			  'late_fee', 'total_payable', 'inv_status', 'meter_count', 'rates']
	writer = csv.DictWriter(fp, restval='', fieldnames= fields, extrasaction='ignore')
	writer.writeheader()
	for prop in proplist:
		propName = prop['property_name']
		inv = generateInvoice(propName, invDate)
		# insertDoc(inv)
		writer.writerow(inv)
	fp.close()

def getEmail (cur,socName, societyId, cafId):

	emlist = []

	qry = "select email from tbl_society_email_settings where caf_id = %s" % (cafId,)	# Can be multiple
	cur.execute(qry)
	resp = cur.fetchall()
	for r in resp:
		if r[0] in emlist:
			continue
		emlist.append(r[0])

	qry = "select email from tbl_society_contact where societyId = %s" % (societyId,) # Multiple
	cur.execute(qry)
	resp = cur.fetchall()
	for r in resp:
		if r[0] in emlist:
			continue
		emlist.append(r[0])

	return '\n'.join(emlist)

def uploadInvoice(sheet, invDate):

	docs =[]
	fp = open(sheet)
	crecs = csv.DictReader(fp)
	for crec in crecs:
		propName = crec['Project Name']
		if propName == '':		# Extra line for additional meters
			doc = docs[-1]		# Last property
			doc['meter_count'] += ',' + crec['No of Meter']
			doc['rates'] += ',' + crec['Service Rate']
		else:
			doc = {
				'doctype': 'RentalInvoices',
				'inv_date': invDate,
				'property_name': propName,
				'inv_number': crec['Invoice Number'],
				'prev_balance': crec['Previous Due'],
				'monthscharge': crec['Amount'],
				'sgst': toFloat(crec['GST @ 18%'])/2,
				'cgst': toFloat(crec['GST @ 18%'])/2,
				'discount': crec['Waiveroff/ Discount Allowed'],
				'late_fee': crec['Interest on late fee 2.5%'],
				'total_payable': crec['Total Due'],
				'amt_rcvd': crec['Amount Received In the month of Jul 2025'],
				'tds': crec['TDS'],
				'total_due': crec['Total Due'],
				'meter_count': crec['No of Meter'],
				'rates': crec['Service Rate'],
				'inv_status': 'Generated',
			}
			docs.append(doc)

	for doc in docs:
		res = insertDoc(doc)
		print (doc["property_name"])
		if not res['ok']:
		    print("Failed invoice for " + propName, str(res))

def uploadContracts(inv):

	lastprop = ''
	fp = open(inv)
	crecs = csv.DictReader(fp)
	for crec in crecs:
		prop = crec['Project Name']
		if prop == '':
			prop = lastprop
		else:
			lastprop = prop

		apprRate = float(crec['Appr Rate']) if crec['Appr Rate'] != '' else 5
		apprPeriod = 12 if apprRate == 5 else 24
		try:
			doc = {'doctype': 'RentalContracts',
			"property_name": prop,
			"orig_rent": crec['OriginalRate'],
			"start_date": datetime
				.strptime(crec['BillingStart'], '%d-%b-%Y')
				.strftime('%Y-%m-%d'),
			"appr_rate": apprRate,
			"appr_period": apprPeriod,
			"meter_count": int(crec['No of Meter']),
			"plantype": crec['Plan'],
			"water_type": crec['Water Type'],
				   }
		except Exception as e:
			print(e)
		print (doc)
		res = insertDoc(doc)
		if not res['ok']:
		    print("Insertion Failed : " + prop + str(res))


# Get name, plan, water type from Invoice
# Address, email, contact name, from DB - tbl_society_master
# props: societyId, caf_id, societyName	(from DB)
# If newOnly, ignore if property already present in Frappe
def uploadProps(inv, newOnly = False):
	invlst= []
	dblist = []
	currentProperties = []

	if newOnly:
		contracts = fetchContract('All')
		currentProperties = [ c['property_name'] for c in contracts]

	with open(inv) as fp:
		crecs = csv.DictReader(fp)
		invlst = [r for r in crecs if r["Project Name"] != '']

	# Construct property name list
	plist = "(" + ','.join([ '"%s"' % p["Project Name"] for p in invlst]) + ")"
	db = mysql.connector.connect(host=rdsServer, user="admin",
								 password='smdb1234', database="nuclious")
	cur = db.cursor()
	qry = "select societyName, societyId, caf_id, address, contactPerson, contactPh1 from tbl_society_master where societyName in %s" % plist
	cur.execute(qry)
	dblist = cur.fetchall()
	docs =[]
	# Create doctype records
	for prop in invlst:
		propname = prop["Project Name"]
		if propname in currentProperties:
			continue	# Exists in frappe
		doc = {
			'doctype': 'RentalCustomers',
			'property_name': propname,
			'city': prop["City"]
		}
		# Search dblist for prop name
		dbr = None
		for r in dblist:
			if r[0] == propname:
				dbr = r
				break
		if dbr is None:
			print ("*** Property %s not found in DB" % propname, file=sys.stderr)
			continue

		doc |= {
		'address': dbr[3],
		'contact_name': dbr[4],
		}
		cafId = dbr[2]

		# Get email ids
		mails = getEmail(cur, propname, dbr[1], cafId)
		doc ['email_cc'] = mails
		print (doc["property_name"])
		res = insertDoc(doc)
		if not res['ok']:
			print ("Insertion Failed : " + propname)


if __name__ == '__main__':
	initFrappe()

	invCsv = "June2025.csv"
	uploadProps(invCsv)
	print('Uploading Contracts')
	uploadContracts(invCsv)
	# print('Uploading Invoices')
	uploadInvoice(invCsv, '2025-04-1')
	# generateAllInvoices('2025-05-01')

	# generateAllInvoices('2025-03-01')
	# compareInvoices('Master Invoice sheet.xlsx - Mar 2025.csv', '/tmp/MarInvGenerated.csv')

