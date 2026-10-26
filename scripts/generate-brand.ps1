Add-Type -AssemblyName System.Drawing
$image = New-Object System.Drawing.Bitmap 1024,1024
$g = [System.Drawing.Graphics]::FromImage($image)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.ColorTranslator]::FromHtml('#E8EFF3'))
$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddBezier(512,188,450,302,300,431,300,563)
$path.AddBezier(300,563,300,831,724,831,724,563)
$path.AddBezier(724,563,724,431,574,302,512,188)
$path.CloseFigure()
$blue = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#2477A5'))
$g.FillPath($blue,$path)
$pen = New-Object System.Drawing.Pen ([System.Drawing.ColorTranslator]::FromHtml('#E8EFF3')),28
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$g.DrawArc($pen,365,445,285,255,35,110)
$g.DrawLine($pen,393,568,440,610)
$image.Save((Join-Path $PSScriptRoot '../assets/images/epmaps-icon.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$pen.Dispose()
$blue.Dispose()
$path.Dispose()
$g.Dispose()
$image.Dispose()
