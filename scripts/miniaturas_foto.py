import numpy as np, sys
def uniform_filter(a,k):
    c=np.pad(a,k//2,mode='edge').cumsum(0).cumsum(1); c=np.pad(c,((1,0),(1,0)))
    H,W=a.shape
    return (c[k:k+H,k:k+W]-c[:H,k:k+W]-c[k:k+H,:W]+c[:H,:W])/(k*k)
from PIL import Image, ImageFilter
def melhor_foto(im, topo=0.55, aspecto=1.4):
    sm=im.resize((200,int(200*im.height/im.width)))
    a=np.asarray(sm.convert('HSV')).astype(float)/255
    s,v=a[...,1],a[...,2]
    cream=(s<0.22)&(v>0.80)
    g=np.asarray(sm.convert('L').filter(ImageFilter.FIND_EDGES)).astype(float)/255
    lum=np.asarray(sm.convert('L')).astype(float)/255
    # flat = local std small
    m=uniform_filter(lum,7); sd=np.sqrt(np.maximum(uniform_filter(lum*lum,7)-m*m,0))
    foto=(~cream)&(sd>0.035)
    H,W=foto.shape; best=(-1,None)
    ii=np.pad(foto.cumsum(0).cumsum(1),((1,0),(1,0)))
    for w in range(int(W*.38),int(W*.62),4):
        h=int(w/aspecto)
        for y in range(0,max(1,int(H*topo)-h),3):
            for x in range(0,W-w+1,3):
                sc=(ii[y+h,x+w]-ii[y,x+w]-ii[y+h,x]+ii[y,x])/(w*h)
                sc=sc*(w**0.3)
                if sc>best[0]: best=(sc,(x,y,w,h))
    x,y,w,h=best[1]; k=im.width/W
    return im.crop((int(x*k),int(y*k),int((x+w)*k),int((y+h)*k))), best[0]
