import openpyxl, json
wb=openpyxl.load_workbook('egpg.xlsx',read_only=True,data_only=True)
def sheet(name, start=4):
    rows=list(wb[name].iter_rows(values_only=True)); hdr=rows[3]; return hdr,[r for r in rows[start:] if r and r[0]]
gh,groups=sheet('3. Corporate groups ')
eh,emps=sheet('2. Employers ')
ih,info=sheet('4. Corporate group info')
json.dump({'groups':[list(map(lambda x: x if x is None or isinstance(x,(int,float,str)) else str(x),r)) for r in groups],
           'emps':[list(map(lambda x: x if x is None or isinstance(x,(int,float,str)) else str(x),r)) for r in emps],
           'info':[list(map(lambda x: x if x is None or isinstance(x,(int,float,str)) else str(x),r)) for r in info],
           'gh':list(gh),'eh':list(eh),'ih':list(ih)},open('wgea.json','w'))
print(len(groups),len(emps),len(info))
