import smtplib
from email.message import EmailMessage
import requests
import json
import re
def send_email(sender_email, sender_password, receiver_email, subject, body, attachments=None):
    """
    Sends an email using Gmail's SMTP server with optional file attachments.
    
    Parameters:
        sender_email (str): Email address of the sender
        sender_password (str): Password or app password for the sender's email
        receiver_email (str): Email address of the recipient
        subject (str): Subject line of the email
        body (str): Body content of the email
        attachments (list, optional): List of file paths to attach to the email
    """
    from email.message import EmailMessage
    import smtplib
    import mimetypes
    import os
    
    msg = EmailMessage()
    msg.set_content(body)
    msg['Subject'] = subject
    msg['From'] = sender_email
    msg['To'] = receiver_email
    
    # Handle attachments
    if attachments:
        for file_path in attachments:
            if os.path.isfile(file_path):
                # Guess the content type based on the file's extension
                ctype, encoding = mimetypes.guess_type(file_path)
                if ctype is None or encoding is not None:
                    # If type could not be guessed, use a generic type
                    ctype = 'application/octet-stream'
                
                maintype, subtype = ctype.split('/', 1)
                
                with open(file_path, 'rb') as fp:
                    file_data = fp.read()
                    filename = os.path.basename(file_path)
                    msg.add_attachment(file_data, maintype=maintype, subtype=subtype, filename=filename)
            else:
                print(f"Warning: The file {file_path} does not exist and was not attached.")
    
    try:
        with smtplib.SMTP_SSL('smtp.gmail.com', 465) as smtp:
            smtp.login(sender_email, sender_password)
            smtp.send_message(msg)
        print("Email sent successfully!")
    except Exception as e:
        print(f"Error sending email: {e}")

def get_gemini_response(prompt, gemini_api_key):
    """Uses Gemini API to get a response based on the prompt using REST API."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_api_key}"
    headers = {'Content-Type': 'application/json'}
    data = {
        "contents": [{
            "parts": [{"text": prompt}]
        }]
    }
    response = requests.post(url, headers=headers, data=json.dumps(data))
    if response.status_code == 200:
        return response.json()['candidates'][0]['content']['parts'][0]['text']
    else:
        return f"Error: {response.status_code}, {response.text}"
def genarate(input_text):
    gemini_prompt = """ # System Instructions for Email Generation AI

    You are an AI Agent who can send professional email content just write the body of the email dont answer any questions just write an email:
    """
    gemini_api_key = "AIzaSyBHWghQhC9DYhkxHZdoFH7PYU1djB0DYvM"  # Replace with your Gemini API key
    Context="You are a AI assistant that writes subject of emails.Emails are gonna be given to you.After this"
    
    Prompt=gemini_prompt+input_text
    body =get_gemini_response(Prompt, gemini_api_key)
    subject_prompt=Context+body
    subject=get_gemini_response(subject_prompt,gemini_api_key)
    return subject,body
if __name__ == '__main__':
    sender_email = "rg6939917@gmail.com"  # Replace with your email
    sender_password = "hvgn gezq vnqk tcwu"  # Replace with your password or app password
    receiver_email = "gamevoice24@gmail.com"  # Replace with recipient email
    subject="file"
    body="test"
    
    send_email(sender_email, sender_password, receiver_email, subject, body,attachments=['/home/nishil/Code/Email Automation/test.xlsx'])