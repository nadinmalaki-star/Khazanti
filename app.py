import os
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

url = "https://nygfcqlvxogxytwwgbjt.supabase.co/rest/v1/transactions"
api_key = os.getenv("SUPABASE_KEY")  # سحب المفتاح بأمان من ملفات البيئة

headers = {
    "apikey": api_key,
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# دالة تحليل البيانات المالية باستخدام Pandas
def analyze_finances():
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        
        # تحويل البيانات إلى DataFrame (جدول بيانات تحليلي)
        df = pd.DataFrame(data)
        
        if df.empty:
            print("📭 لا توجد بيانات كافية للتحليل حالياً.")
            return

        print("\n📈 --- تقرير التحليل المالي المتقدم (Pandas) ---")
        print(df)
        print("-" * 40)
        
        # تجميع المبالغ حسب نوع الحركة (دخل أو مصروف)
        summary = df.groupby('type')['amount'].sum()
        print("💡 إجمالي الحركات حسب النوع:")
        print(summary)
        print("-" * 40)
        
    else:
        print("❌ حدث خطأ في جلب البيانات للتحليل:", response.text)

# تشغيل دالة التحليل
analyze_finances()

def generate_treasury_report():
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        df = pd.DataFrame(response.json())
        
        # تصفية البيانات لنركز فقط على المصروفات
        expenses = df[df['type'] == 'مصروف']
        
        # استخدام التجميع (Aggregation) لحساب الإجمالي والعدد لكل فئة
        report = expenses.groupby('category')['amount'].agg(['sum', 'count', 'mean'])
        
        print("\n📊 --- تقرير الخزينة التحليلي (Aggregated Report) ---")
        print(report)
        print("-" * 50)
        print("💡 تم إعداد التقرير بنجاح: إجمالي، عدد الحركات، ومتوسط القيمة لكل فئة.")

generate_treasury_report()
headers = {
    "apikey": api_key,
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

# دالة تحليل البيانات المالية باستخدام Pandas
def analyze_finances():
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        data = response.json()
        
        # تحويل البيانات إلى DataFrame (جدول بيانات تحليلي)
        df = pd.DataFrame(data)
        
        if df.empty:
            print("📭 لا توجد بيانات كافية للتحليل حالياً.")
            return

        print("\n📈 --- تقرير التحليل المالي المتقدم (Pandas) ---")
        print(df)
        print("-" * 40)
        
        # تجميع المبالغ حسب نوع الحركة (دخل أو مصروف)
        summary = df.groupby('type')['amount'].sum()
        print("💡 إجمالي الحركات حسب النوع:")
        print(summary)
        print("-" * 40)
        
    else:
        print("❌ حدث خطأ في جلب البيانات للتحليل:", response.text)

# تشغيل دالة التحليل
analyze_finances()

def generate_treasury_report():
    response = requests.get(url, headers=headers)
    if response.status_code == 200:
        df = pd.DataFrame(response.json())
        
        # تصفية البيانات لنركز فقط على المصروفات
        expenses = df[df['type'] == 'مصروف']
        
        # استخدام التجميع (Aggregation) لحساب الإجمالي والعدد لكل فئة
        report = expenses.groupby('category')['amount'].agg(['sum', 'count', 'mean'])
        
        print("\n📊 --- تقرير الخزينة التحليلي (Aggregated Report) ---")
        print(report)
        print("-" * 50)
        print("💡 تم إعداد التقرير بنجاح: إجمالي، عدد الحركات، ومتوسط القيمة لكل فئة.")

generate_treasury_report()