import asciiDoctorLib from 'asciidoctor.js';
import _ from 'lodash';
import moment from 'moment';
import slugify from 'hubpress-core-slugify';//'./utils/slugify'

const asciidoctor = asciiDoctorLib(false, window.XMLHttpRequest);
const opal = asciidoctor.Opal;
const processor = asciidoctor.Asciidoctor(true);

function splitMore(asciidocContent) {
  let parts = asciidocContent.split('pass::[more]');
  return {
    excerpt: parts[0],
    full: parts.join('')
  };
}

function convert (opts, _asciidocContent) {
  const options = opal.hash({
    doctype: 'article',
    backend: 'html5',
    //base_dir: opts.state.application.config.urls.site,
    safe: 'unsafe',
    attributes: ['showtitle!', 'allow-uri-read', `imagesdir=${opts.state.application.config.urls.site}/images`, 'icons=font']
  });
  const gistRx = /gist::([0-9]*)\[(lines=[0-9]*\.\.[0-9]*)?,?(type=([\w.]*))?,?(file=([\w.]*))?\]/g
  const asciidocContent = _asciidocContent.replace(gistRx, '[source,$4]\n----\ninclude::https://gist.githubusercontent.com/raw/$1/$6[$2]\n----\n');
  let parts = splitMore(asciidocContent);
  let excerpt = processor.$load(parts.excerpt, options);
  let doc = processor.$load(parts.full, options);
  let value = {
    attributes: _.pick(doc.attributes, ['$$smap']),
    excerpt: excerpt.$convert(),
    html: doc.$convert()
  };
  return value;
}

function extractTags (attributes) {
  const tagAttribute = 'hp-tags';
  return attributes.$$smap[tagAttribute] && attributes.$$smap[tagAttribute].split(',').filter(v => v.trim() !== '');
}

export function asciidocPlugin (hubpress) {

  hubpress.on('requestRenderingDocuments', (opts) => {
    console.info('Asciidoc Plugin - requestRenderingDocuments');
    console.log('requestRenderingDocuments', opts);

    const posts = (opts.data.documents.posts || []).map((post) => {
      const _post = Object.assign({}, post, convert(opts, post.content), {
        content: post.content
      });


      let original = _.pick(_post, 'attributes', 'author', 'html', 'tags', 'content', 'name', 'path', 'sha');

      _post.title = original.title = original.attributes.$$smap['doctitle'] ;
      _post.image = original.image = original.attributes.$$smap['hp-image'] ;
      _post.tags = original.tags = extractTags(original.attributes);
      _post.url = original.url = opts.state.application.config.urls.getPostUrl(original.name);

      let _postToSave = Object.assign({}, _post, {original: original});
      _postToSave.original.published_at = _postToSave.published_at = original.name.split('-').slice(0,3).join('-');

      return _postToSave;
    });

    const mergeDocuments = Object.assign({}, opts.data.documents, {posts});
    const data = Object.assign({}, opts.data, {documents: mergeDocuments});
    return Object.assign({}, opts, {data});
  });

  hubpress.on('requestRenderingPost', (opts) => {
    console.info('Asciidoc Plugin - requestRenderingPost');
    console.log('requestRenderingPost', opts);

    let refreshedPost = convert(opts, opts.data.post.content);
    refreshedPost._id = opts.data.post._id;
    refreshedPost.title = refreshedPost.attributes.$$smap['doctitle'];
    refreshedPost.image = refreshedPost.attributes.$$smap['hp-image'] ;
    refreshedPost.tags = extractTags(refreshedPost.attributes);
    refreshedPost.published_at = refreshedPost.attributes.$$smap['published_at'] || opts.data.post.published_at || moment().format('YYYY-MM-DD');
    let altTitle = refreshedPost.attributes.$$smap['hp-alt-title'];
    refreshedPost.name = slugify(refreshedPost.published_at + '-' + (altTitle || refreshedPost.title)) +'.adoc';
    refreshedPost.url = opts.state.application.config.urls.getPostUrl(refreshedPost.name);

    const mergedPost = Object.assign({}, opts.data.post, refreshedPost);
    const data = Object.assign({}, opts.data, {post: mergedPost});
    return Object.assign({}, opts, {data});
  });

}
