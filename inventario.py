# Import the required libraries
from cgitb import text
from tkinter import *
from tkinter import messagebox, ttk
from turtle import bgcolor
#import gspread and access spreadsheets via Google Sheets API, you need to authenticate and authorize your application.
import gspread

gc = gspread.service_account(filename='cred.json')
gs = gc.open_by_key('1l_bjgqqodsmAYG5whfKXCuwZt0xeFvHtsSPPY9MLf-M').sheet1


#statrting Tkinterapp
window=Tk()
window.title("Proyecto-Inventario")
window.geometry("640x440")
window['bg']='#c0d860'


#clean all inputs
def Clear():
   producto.delete(0,END)
   precio.delete(0,END)
   stock.delete(0,END)
#Data validation
def validation():
        return len(producto.get()) != 0 and len(precio.get()) != 0 and len(stock.get()) != 0


#CREATE
def Add():
    if validation():
        lst=[producto.get(),precio.get(),stock.get()]
        gs.insert_row(lst)
    else:
        messagebox.showerror('¡Atención!', 'Ingresa todos los datos para poder añadir el producto')
    #messagebox.showinfo('Informacion','Los datos han sido eliminados')

#Read ()
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
tree.column("#0", width=150 )
tree.column("col1", width=150 , anchor="center")
tree.column("col2", width=150 , anchor="center")
tree.heading("#0", text="Producto", anchor="center")
tree.heading("col1", text="Precio compra", anchor="center")
tree.heading("col2", text="Precio venta", anchor="center")

get_products()
# 3 labels, 4 buttons,3 entry fields
label1=Label(window,text="Nombre del producto: ",padx=20,pady=10, bg="#b7be5f")
label2=Label(window,text="Precio  del  compra: ",padx=20,pady=10, bg="#b7be5f")
label3=Label(window,text="Precio de venta: ",padx=20,pady=10, bg="#b7be5f")

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