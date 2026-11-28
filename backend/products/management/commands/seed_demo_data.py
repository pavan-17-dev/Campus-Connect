"""
python manage.py seed_demo_data [--password ...] [--with-admin] [--no-images]

Creates demo students, the sample listings used by the React prototype, a few
orders and conversations. Safe to run more than once (existing rows are reused).
"""
import io
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
from PIL import Image, ImageDraw

from messaging import services as chat
from orders import services as order_services
from products.models import Category, Product, ProductImage

User = get_user_model()

SELLERS = [
    ("aarav.sharma@bmsce.ac.in", "Aarav Sharma", "BMS College of Engineering", "1BM23CS001"),
    ("priya.nair@bmsce.ac.in", "Priya Nair", "BMS College of Engineering", "1BM23EC014"),
    ("rohan.kulkarni@rvce.edu.in", "Rohan Kulkarni", "RV College of Engineering", "1RV22CS102"),
    ("sneha.reddy@pes.edu", "Sneha Reddy", "PES University", "PES1UG22CS210"),
    ("karthik.iyer@bmsce.ac.in", "Karthik Iyer", "BMS College of Engineering", "1BM24ME033"),
    ("ananya.gupta@msrit.edu", "Ananya Gupta", "MS Ramaiah Institute of Technology", "1MS23IS045"),
]

# (title, price, original, category, condition, seller index, location, status, featured, days ago, description)
PRODUCTS = [
    ("Engineering Mathematics – B.S. Grewal (44th Ed.)", 450, 1150, "books", "good", 0, "Main Library Entrance", "available", True, 3,
     "Higher Engineering Mathematics by Dr. B.S. Grewal, 44th edition. Covers calculus, differential equations, Laplace transforms, Fourier series and numerical methods. A few pencil highlights in the first three chapters, otherwise clean."),
    ("Casio fx-991ES Plus Scientific Calculator", 750, 1295, "electronics", "like_new", 1, "CSE Block, 2nd Floor", "available", True, 1,
     "Casio fx-991ES Plus with 417 functions and natural textbook display. Allowed in university exams. Used for one semester and comes with the original hard cover. Battery recently replaced."),
    ("Dell Inspiron 15 Laptop – i5 11th Gen, 8GB RAM", 32000, 58000, "electronics", "good", 2, "Boys Hostel Block C", "available", True, 5,
     "Dell Inspiron 15 3511 with Intel Core i5-1135G7, 8GB RAM, 512GB SSD and Full HD display. Battery gives about 4 hours. Minor scratches on the lid. Comes with original charger and a laptop sleeve."),
    ("Wildcraft College Backpack – 35L", 900, 2199, "accessories", "like_new", 3, "Food Court, Ring Road Campus", "available", True, 2,
     "Wildcraft 35L laptop backpack with padded 15.6 inch compartment, rain cover and bottle pockets. Used for a few months. No tears and all zips work perfectly."),
    ("White Lab Coat – Full Sleeves (Size M)", 250, 550, "clothing", "good", 4, "Chemistry Lab, Block A", "available", True, 7,
     "Cotton full-sleeve lab coat, size M, suitable for chemistry and biotech labs. Washed and ironed, with three pockets. College logo has been removed."),
    ("Engineering Drawing Instrument Box + Mini Drafter", 600, 1400, "stationery", "like_new", 5, "Mechanical Block Lobby", "available", True, 4,
     "Complete engineering drawing kit: Omega mini drafter, compass set, set squares, protractor, clutch pencils and a sheet container. Everything needed for Engineering Graphics."),
    ("Sony WH-CH720N Noise Cancelling Headphones", 5200, 9990, "electronics", "like_new", 1, "Girls Hostel Reception", "available", False, 0,
     "Sony WH-CH720N wireless headphones with active noise cancellation and 35-hour battery. Barely used, includes box and cable. Ideal for studying in a noisy hostel."),
    ("Data Structures Using C – Reema Thareja", 300, 695, "books", "used", 0, "Main Library Entrance", "available", False, 10,
     "Oxford University Press, 2nd edition. Some underlining and helpful notes in the margins. Covers arrays, linked lists, stacks, queues, trees and graphs."),
    ("Hercules Roadeo Hybrid Bicycle", 6500, 13000, "sports", "good", 2, "Main Gate Parking", "sold", False, 6,
     "21-speed hybrid bicycle, perfect for getting around a big campus. Recently serviced with new brake pads. Comes with a lock and a front light."),
    ("SG English Willow Cricket Bat", 1800, 3500, "sports", "good", 4, "Sports Complex", "available", False, 8,
     "SG English willow bat, short handle, knocked-in and ready to play. Used for one inter-college season. Includes bat cover."),
    ("Philips LED Study Table Lamp", 550, 1299, "hostel", "like_new", 3, "Girls Hostel Block B", "available", False, 1,
     "Philips rechargeable LED desk lamp with three brightness levels and a flexible neck. Eye-comfort light that is perfect for late-night study sessions."),
    ("Prestige Electric Kettle 1.5L", 450, 999, "hostel", "good", 5, "Hostel Mess Hall", "available", False, 9,
     "Prestige stainless steel 1.5L electric kettle with auto shut-off. Great for Maggi, tea and coffee in the hostel. Cleaned and descaled."),
    ("College Fest Hoodie – Navy Blue (Size L)", 400, 899, "clothing", "like_new", 1, "Student Activity Centre", "available", False, 13,
     "Official college fest hoodie, fleece-lined, size L. Worn twice. Super comfortable for winter mornings and 8 AM lectures."),
    ("Classmate Notebooks – Pack of 6 (Unused)", 220, 360, "stationery", "new", 3, "Stationery Shop Corner", "available", False, 0,
     "Six brand-new Classmate long notebooks, 172 pages each, single line. Bought extra at the start of the semester. Sealed pack."),
    ("Redmi Note 12 Pro – 8GB/128GB", 11500, 21999, "electronics", "good", 4, "ECE Block Canteen", "sold", False, 15,
     "Redmi Note 12 Pro 5G in Onyx Black with 8GB RAM and 128GB storage. Screen guard and case applied since day one. Box and charger included."),
    ("Fastrack Analog Watch – Unisex", 650, 1595, "accessories", "good", 5, "Admin Block", "available", False, 11,
     "Fastrack minimalist analog watch with a leather strap. Water resistant. Perfect for exam halls where phones are not allowed."),
    ("Yonex Badminton Racket + Shuttle Box", 1100, 2400, "sports", "like_new", 0, "Indoor Stadium", "available", False, 2,
     "Yonex Nanoray light racket with full cover and a box of Mavis 350 shuttles (6 left). Strings are fresh."),
    ("Operating System Concepts – Galvin (9th Ed.)", 550, 1099, "books", "like_new", 2, "CSE Department", "available", False, 1,
     "The classic dinosaur book by Silberschatz, Galvin and Gagne. Wiley student edition. Clean pages, no markings. Essential for 4th semester CSE/ISE."),
]

PALETTE = {
    "books": "#2563EB", "electronics": "#7C3AED", "stationery": "#0891B2", "clothing": "#DB2777",
    "accessories": "#EA580C", "sports": "#16A34A", "hostel": "#CA8A04", "furniture": "#9333EA", "other": "#475569",
}


def make_image(title, category_slug, variant):
    """A simple branded placeholder JPEG so the demo exercises real image uploads."""
    color = PALETTE.get(category_slug, "#2563EB")
    image = Image.new("RGB", (800, 600), "#EFF6FF")
    draw = ImageDraw.Draw(image)
    draw.rectangle([0, 0, 800, 600], fill=color if variant == 0 else "#DBEAFE")
    draw.rounded_rectangle([60, 60, 740, 540], radius=36, fill="#FFFFFF")
    # Pillow's built-in font has no en dash / curly quotes, so use plain ASCII on the image.
    words, lines, line = title.replace("–", "-").replace("’", "'").split(), [], ""
    for word in words:
        if len(line) + len(word) > 26:
            lines.append(line)
            line = word
        else:
            line = f"{line} {word}".strip()
    lines.append(line)
    y = 300 - len(lines) * 18
    for text in lines[:5]:
        draw.text((400, y), text, fill="#1E293B", anchor="mm", font_size=34)
        y += 44
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=85)
    return ContentFile(buffer.getvalue(), name=f"{category_slug}-{variant}.jpg")


class Command(BaseCommand):
    help = "Load demo users, listings, orders and messages for development and presentations."

    def add_arguments(self, parser):
        parser.add_argument("--password", default="CampusDemo@2026", help="Password for every demo account")
        parser.add_argument("--with-admin", action="store_true", help="Also create admin@campusconnect.ac.in")
        parser.add_argument("--no-images", action="store_true", help="Skip generating product images")

    @transaction.atomic
    def handle(self, *args, **options):
        password = options["password"]
        users = []
        for email, name, college, student_id in SELLERS:
            user, created = User.objects.get_or_create(
                email=email, defaults={"full_name": name, "college": college, "student_id": student_id, "is_email_verified": True}
            )
            if created:
                user.set_password(password)
                user.save()
            users.append(user)

        buyer, created = User.objects.get_or_create(
            email="demo.student@bmsce.ac.in",
            defaults={"full_name": "Demo Student", "college": "BMS College of Engineering", "student_id": "1BM25CS999", "is_email_verified": True},
        )
        if created:
            buyer.set_password(password)
            buyer.save()

        if options["with_admin"]:
            admin, created = User.objects.get_or_create(
                email="admin@campusconnect.ac.in",
                defaults={"full_name": "Campus Admin", "college": "Campus Connect", "role": User.Role.ADMIN, "is_staff": True, "is_superuser": True},
            )
            if created:
                admin.set_password(password)
                admin.save()

        categories = {c.slug: c for c in Category.objects.all()}
        products = []
        now = timezone.now()
        for title, price, original, cat, condition, seller_idx, location, status, featured, days, description in PRODUCTS:
            product, created = Product.objects.get_or_create(
                title=title,
                seller=users[seller_idx],
                defaults={
                    "description": description, "price": Decimal(price), "original_price": Decimal(original),
                    "category": categories[cat], "condition": condition, "location": location,
                    "status": status, "is_featured": featured,
                },
            )
            if created:
                Product.objects.filter(pk=product.pk).update(created_at=now - timedelta(days=days, hours=seller_idx))
                if not options["no_images"]:
                    for variant in range(2):
                        ProductImage.objects.create(product=product, image=make_image(title, cat, variant))
            products.append(product)

        # A couple of orders and conversations for the demo student.
        laptop, calculator = products[2], products[1]
        if not buyer.orders_placed.exists():
            order_services.place_order(buyer=buyer, product_id=calculator.pk, note="Can I pick it up after the 2 PM lab?")
        conversation, created = chat.get_or_create_conversation(buyer, laptop.seller, laptop)
        if created:
            chat.send_message(conversation, buyer, "Hi! Is the Dell Inspiron still available?")
            chat.send_message(conversation, laptop.seller, "Hey! Yes, it is. Are you looking for it for coding?")
            chat.send_message(conversation, buyer, "Yes, mostly for DSA and web dev projects. How is the battery?")
            chat.send_message(conversation, laptop.seller, "About 4 hours with normal use. Can we meet at the main gate at 4 PM?")

        self.stdout.write(self.style.SUCCESS(
            f"Demo data ready: {len(users) + 1} students, {len(products)} listings. "
            f"Log in as demo.student@bmsce.ac.in with password '{password}'."
        ))
