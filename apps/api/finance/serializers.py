from rest_framework import serializers

from finance.models import SalaryConfig


class SalaryConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalaryConfig
        fields = ("id", "payment_type", "rate", "currency", "is_active", "created_at")
        read_only_fields = fields


class SetSalarySerializer(serializers.Serializer):
    salary_type = serializers.ChoiceField(
        choices=SalaryConfig.PaymentType.choices,
        required=True,
    )
    salary_amount = serializers.DecimalField(
        max_digits=14, decimal_places=2, required=True, min_value=0
    )
    currency = serializers.CharField(max_length=10, required=False, default="IRR")
