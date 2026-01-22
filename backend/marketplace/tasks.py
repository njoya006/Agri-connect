from celery import shared_task
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string


@shared_task(bind=True)
def send_order_email(self, subject: str, template_name: str, context: dict, from_email: str, to_emails: list):
    try:
        html_content = render_to_string(template_name, context)
        text_content = render_to_string(template_name.replace('.html', '.txt'), context)

        msg = EmailMultiAlternatives(subject=subject, body=text_content, from_email=from_email, to=to_emails)
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
    except Exception as exc:
        raise self.retry(exc=exc, countdown=30, max_retries=3)
