from django.db import migrations

# Slugs match the React frontend (src/data/categories.js).
DEFAULT_CATEGORIES = [
    ("Books", "books", "Textbooks, reference guides & novels", "bi-book"),
    ("Electronics", "electronics", "Laptops, calculators, phones & gadgets", "bi-laptop"),
    ("Stationery", "stationery", "Notebooks, drawing kits & art supplies", "bi-pencil"),
    ("Clothing", "clothing", "Lab coats, hoodies & college merch", "bi-bag-heart"),
    ("College Accessories", "accessories", "Backpacks, ID holders & watches", "bi-backpack"),
    ("Sports Equipment", "sports", "Bats, rackets, footballs & cycles", "bi-trophy"),
    ("Hostel Essentials", "hostel", "Lamps, kettles, mattresses & more", "bi-house-heart"),
    ("Furniture", "furniture", "Study tables, chairs, shelves & storage", "bi-lamp"),
    ("Other", "other", "Everything else students need", "bi-grid"),
]


def create_categories(apps, schema_editor):
    Category = apps.get_model("products", "Category")
    for name, slug, description, icon in DEFAULT_CATEGORIES:
        Category.objects.get_or_create(slug=slug, defaults={"name": name, "description": description, "icon": icon})


def remove_categories(apps, schema_editor):
    Category = apps.get_model("products", "Category")
    Category.objects.filter(slug__in=[c[1] for c in DEFAULT_CATEGORIES], products__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [("products", "0001_initial")]

    operations = [migrations.RunPython(create_categories, remove_categories)]
