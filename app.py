from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="خزنتي API", description="الواجهة البرمجية لتطبيق خزينتي المالي")

app.mount("/static", StaticFiles(directory="static"), name="static")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

class TransactionCreate(BaseModel):
    description: str
    amount: float
    type: str
    date: str

@app.get("/")
def read_root():
    return {"message": "أهلاً بكِ يا نادين في لوحة تحكم خزينتي عبر FastAPI! 🚀"}

@app.get("/summary-db")
def get_real_financial_summary():
    try:
        response = supabase.table("transactions").select("*").execute()
        data = response.data  
        
        total_income = 0.0
        total_expenses = 0.0
        
        for item in data:
            amount = float(item.get("amount") or 0)
            trans_type = item.get("type")
            
            if trans_type == "دخل":
                total_income += amount
            elif trans_type == "مصروف":
                total_expenses += amount
                
        net_balance = total_income - total_expenses
        spending_rate = (total_expenses / total_income * 100) if total_income > 0 else 0.0
        
        return {
            "status": "success",
            "total_transactions": len(data),
            "financial_summary": {
                "total_income": total_income,
                "total_expenses": total_expenses,
                "net_balance": net_balance,
                "spending_rate": round(spending_rate, 1)
            },
            "transactions_details": data
        }
        
    except Exception as e:
        return {"error": str(e)}

@app.post("/add-transaction")
def add_new_transaction(tx: TransactionCreate):
    try:
        response = supabase.table("transactions").insert({
            "description": tx.description,
            "amount": tx.amount,
            "type": tx.type,
            "date": tx.date
        }).execute()
        
        return {"status": "success", "data": response.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/delete-transaction/{transaction_id}")
def delete_transaction(transaction_id: int):
    try:
        response = supabase.table("transactions").delete().eq("id", transaction_id).execute()
        return {"status": "success", "data": response.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/home", response_class=HTMLResponse)
def get_frontend():
    html_path = os.path.join("templates", "index.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            return f.read()
    return "ملف index.html غير موجود"
