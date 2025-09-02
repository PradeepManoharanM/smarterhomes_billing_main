import sendgrid
from sendgrid.helpers.mail import Mail, Cc, To, From, Subject, Content, HtmlContent
from bs4 import BeautifulSoup

def sendMail(toList, ccList, subject, html):
    SENDGRID_API_KEY='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'
    sendgridClient = sendgrid.SendGridAPIClient(api_key=SENDGRID_API_KEY)
    htmlContent = HtmlContent(html)
    soup = BeautifulSoup(html, features='lxml')
    plain_text = soup.get_text()
    plainTextContent = Content("text/plain", plain_text)
    message = Mail(From('no-reply@wateron.cc'), [To(toAddr) for toAddr in toList],
            Subject(subject), plainTextContent, htmlContent)
    message.cc = [Cc(ccAddr) for ccAddr in ccList]
    response = sendgridClient.send(message)
    print(response.status_code)


