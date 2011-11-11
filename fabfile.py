import os
import sys

from fabric.api import *
from fabric.contrib.project import rsync_project

try:
    import fabfile_local
except ImportError:
    pass

ROOT = os.path.abspath(os.path.dirname(__file__))
path = lambda *x: os.path.join(ROOT, *x)

sys.path.append(path('vendor'))

@task
def deploy():
    run('mkdir -p %s' % env.remote_dir)
    rsync_project(remote_dir=env.remote_dir,
                  local_dir='static-files/')
    print "files placed in %s" % env.serve_dir

@task
def freeze():
    import imagepal

    distdir = path('dist')
    local('mkdir -p %s' % distdir)

    staticdir = path('static-files')
    local('cp -R %s/ %s/' % (staticdir, distdir))

    filename = 'sample-etherpad-content.html'
    source = open(os.path.join(staticdir, filename)).read()
    quilt = imagepal.rebase(source, distdir)

    html = open(os.path.join(staticdir, 'index.html')).read()
    index = open(os.path.join(distdir, 'index.html'), 'w')
    index.write(html + '<div id="embedded-quilt">\n%s</div>' % quilt)
    index.close()
