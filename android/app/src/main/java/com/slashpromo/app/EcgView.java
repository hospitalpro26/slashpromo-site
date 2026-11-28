package com.slashpromo.app;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.view.MotionEvent;
import android.view.ScaleGestureDetector;
import android.view.View;

/** Read-only tracing viewer: independent of book notes and highlights. */
final class EcgView extends View {
    private final Bitmap bitmap;
    private final ScaleGestureDetector pinch;
    private float zoom=1f, x=0f, y=0f, lastX, lastY;
    EcgView(Context context, Bitmap source) {
        super(context); bitmap=source; setBackgroundColor(Color.WHITE);
        setContentDescription("Clinical ECG. Pinch to zoom and drag to inspect leads.");
        pinch=new ScaleGestureDetector(context,new ScaleGestureDetector.SimpleOnScaleGestureListener(){
            @Override public boolean onScale(ScaleGestureDetector detector){
                float next=Math.max(1f,Math.min(8f,zoom*detector.getScaleFactor()));
                float ratio=next/zoom;
                x=detector.getFocusX()-(detector.getFocusX()-x)*ratio;
                y=detector.getFocusY()-(detector.getFocusY()-y)*ratio;
                zoom=next; bound(); invalidate(); return true;
            }
        });
    }
    private float fit(){return Math.min((float)getWidth()/bitmap.getWidth(),(float)getHeight()/bitmap.getHeight());}
    private void bound(){
        float w=bitmap.getWidth()*fit()*zoom,h=bitmap.getHeight()*fit()*zoom;
        x=w<=getWidth()?(getWidth()-w)/2:Math.min(0,Math.max(getWidth()-w,x));
        y=h<=getHeight()?(getHeight()-h)/2:Math.min(0,Math.max(getHeight()-h,y));
    }
    @Override protected void onSizeChanged(int w,int h,int ow,int oh){bound();}
    @Override protected void onDraw(Canvas canvas){
        super.onDraw(canvas); canvas.save(); canvas.translate(x,y); canvas.scale(fit()*zoom,fit()*zoom);
        canvas.drawBitmap(bitmap,0,0,null);canvas.restore();
    }
    @Override public boolean onTouchEvent(MotionEvent event){
        pinch.onTouchEvent(event);
        if(event.getActionMasked()==MotionEvent.ACTION_DOWN){lastX=event.getX();lastY=event.getY();return true;}
        if(event.getActionMasked()==MotionEvent.ACTION_MOVE){
            if(!pinch.isInProgress()&&event.getPointerCount()==1){x+=event.getX()-lastX;y+=event.getY()-lastY;bound();invalidate();}
            lastX=event.getX();lastY=event.getY();return true;
        }
        if(event.getActionMasked()==MotionEvent.ACTION_POINTER_UP){int remaining=event.getActionIndex()==0?1:0;lastX=event.getX(remaining);lastY=event.getY(remaining);}
        if(event.getActionMasked()==MotionEvent.ACTION_UP)performClick();
        return true;
    }
    @Override public boolean performClick(){super.performClick();return true;}
}
