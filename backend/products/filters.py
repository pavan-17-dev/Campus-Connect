import django_filters
from django.db.models import Q

from .models import Product

CONDITION_ALIASES = {label.lower(): value for value, label in Product.Condition.choices}
CONDITION_ALIASES.update({value: value for value, _ in Product.Condition.choices})
CONDITION_ALIASES["fair"] = Product.Condition.USED  # older frontend label


def _csv(value):
    return [v.strip() for v in value.split(",") if v.strip()]


class ProductFilter(django_filters.FilterSet):
    """
    Query parameters for /api/products/:
      category=books,electronics   (slugs, comma separated)
      condition=new,like_new        (codes or labels such as "Like New")
      min_price=500&max_price=2000
      status=available|reserved|sold
      available=true|false
      seller=<user id>
      campus=<text>
    Plus ?search=, ?ordering=price|-price|created_at|-created_at, ?page=, ?page_size=
    """

    category = django_filters.CharFilter(method="filter_category")
    condition = django_filters.CharFilter(method="filter_condition")
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    status = django_filters.ChoiceFilter(choices=Product.Status.choices)
    available = django_filters.BooleanFilter(method="filter_available")
    seller = django_filters.NumberFilter(field_name="seller_id")
    campus = django_filters.CharFilter(field_name="campus", lookup_expr="icontains")

    class Meta:
        model = Product
        fields = ["category", "condition", "min_price", "max_price", "status", "available", "seller", "campus"]

    def filter_category(self, queryset, name, value):
        slugs = _csv(value)
        query = Q(category__slug__in=slugs)
        ids = [s for s in slugs if s.isdigit()]
        if ids:
            query |= Q(category_id__in=ids)
        return queryset.filter(query)

    def filter_condition(self, queryset, name, value):
        codes = {CONDITION_ALIASES.get(v.lower()) for v in _csv(value)} - {None}
        return queryset.filter(condition__in=codes) if codes else queryset.none()

    def filter_available(self, queryset, name, value):
        if value is True:
            return queryset.filter(status=Product.Status.AVAILABLE)
        if value is False:
            return queryset.exclude(status=Product.Status.AVAILABLE)
        return queryset
