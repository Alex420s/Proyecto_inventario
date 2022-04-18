# Import the required libraries
from csv import *
from tkinter import *
from tkinter import messagebox
from tkinter import ttk
import gspread
window=Tk()
window.title("Proyecto-Inventario")
window.geometry("700x350")
datos_obtenidos=[]
gc = gspread.service_account(filename='cred.json')
gs = gc.open_by_key('1QWzIqTxz3Sv_1vNTP4VwzCFAoj8srEr1T7m_kTgN1LI').sheet1

def Add():
    if validation():
        lst=[producto.get(),precio.get(),stock.get()]
        gs.insert_row(lst)
    else:
        messagebox.showerror('Informacion', 'Ingresa todos los datos')

def Clear():
   producto.delete(0,END)
   precio.delete(0,END)
   stock.delete(0,END)
   #messagebox.showinfo('Informacion','Los datos han sido eliminados')
def validation():
        return len(producto.get()) != 0 and len(precio.get()) != 0 and len(stock.get()) != 0
def get_products():
        #cleanin table
        records = tree.get_children()
        for element in records:
            tree.delete(element)
        #get_rows
        items = gs.get_all_values()
        for row in items:
            tree.insert("",END,text=row[0], values=(row[1],row[2]))
tree = ttk.Treeview(columns=('col1','col2'))

get_products()

# 3 labels, 4 buttons,3 entry fields
label1=Label(window,text="Producto: ",padx=20,pady=10)
label2=Label(window,text="Precio: ",padx=20,pady=10)
label3=Label(window,text="Stock: ",padx=20,pady=10)

producto=Entry(window,width=30,borderwidth=3)
precio=Entry(window,width=30,borderwidth=3)
stock=Entry(window,width=30,borderwidth=3)

update=Button(window,text="Update",command=get_products)
add=Button(window,text="Add",command=Add)
clear=Button(window,text="Clear",command=Clear)
Exit=Button(window,text="Exit",command=window.quit)

label1.grid(row=0,column=0)
label2.grid(row=1,column=0)
label3.grid(row=2,column=0)
producto.grid(row=0,column=1)
precio.grid(row=1,column=1)
stock.grid(row=2,column=1)

update.grid(row=4,column=0,columnspan=2)
add.grid(row=3,column=1,columnspan=2)
clear.grid(row=4,column=1,columnspan=2)
Exit.grid(row=3,column=0,columnspan=2)
tree.grid(row=5, column=1,columnspan=2)

window.mainloop()