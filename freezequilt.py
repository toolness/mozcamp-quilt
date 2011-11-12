import os
import sys
import distutils.dir_util

ROOT = os.path.abspath(os.path.dirname(__file__))
path = lambda *x: os.path.join(ROOT, *x)

sys.path.append(path('vendor'))

import imagepal

if __name__ == '__main__':
    distdir = path('dist')
    staticdir = path('static-files')
    distutils.dir_util.copy_tree(staticdir, distdir)

    filename = 'sample-etherpad-content.html'
    source = open(os.path.join(staticdir, filename)).read()
    quilt = imagepal.rebase(source, distdir)

    html = open(os.path.join(staticdir, 'index.html')).read()
    index = open(os.path.join(distdir, 'index.html'), 'w')
    index.write(html + '<div id="embedded-quilt">\n%s</div>' % quilt)
    index.close()

    print "quilt frozen and saved in %s." % distdir
