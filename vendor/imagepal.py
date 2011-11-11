import os
import urllib2
import hashlib
import mimetypes
import StringIO

import html5lib
from html5lib.serializer.htmlserializer import HTMLSerializer

preferred_exts = {
  '.jpe': '.jpg'
}

VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif']

class HTMLDocument(object):
    def __init__(self, source, destdir):
        dombuilder = html5lib.treebuilders.getTreeBuilder("dom")
        p = html5lib.HTMLParser(tree=dombuilder)
        self.document = p.parse(source)
        self.html = self.document.documentElement
        self.destdir = destdir
        self.counter = 0
        self._traverse(self.html)

    def _traverse(self, node):
        if node.nodeName == 'img':
            src = node.getAttribute('src')
            guess_ext = ".%s" % src.split('.')[-1].lower()
            ext = None
            basename = None
            filename = None
            if guess_ext in VALID_EXTENSIONS:
                ext = guess_ext
                basename = "img_%s%s" % (hashlib.md5(src).hexdigest(), ext)
                filename = os.path.join(self.destdir, basename)
            if filename is None or not os.path.exists(filename):
                print "fetching %s" % src
                try:
                    f = urllib2.urlopen(src)
                    ext = mimetypes.guess_extension(f.info()['content-type'])
                    ext = preferred_exts.get(ext, ext)
                    basename = "img_%s%s" % (hashlib.md5(src).hexdigest(),
                                             ext)
                    filename = os.path.join(self.destdir, basename)
                    open(filename, 'w').write(f.read())
                except urllib2.HTTPError, e:
                    print "ERROR %s" % e
            node.setAttribute('src', basename)
        children = [child for child in node.childNodes
                    if child.nodeType == child.ELEMENT_NODE]
        for child in children:
            self._traverse(child)

    def serialize(self, output):
        walker = html5lib.treewalkers.getTreeWalker("dom")
        stream = walker(self.document)
        s = HTMLSerializer(omit_optional_tags=True)
        output_generator = s.serialize(stream)
        for item in output_generator:
            output.write(item.encode('utf-8'))

def rebase(source, destdir):
    f = StringIO.StringIO()
    doc = HTMLDocument(source, destdir)
    doc.serialize(f)
    return f.getvalue()
