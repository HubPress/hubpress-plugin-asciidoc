import asciiDoctorLib from 'asciidoctor.js'
import _ from 'lodash'
import moment from 'moment'
import slugify from 'hubpress-core-slugify'//'./utils/slugify'

const asciidoctor = asciiDoctorLib();
const opal = asciidoctor.Opal;
const processor = asciidoctor.Asciidoctor();
const options = opal.hash({
  doctype: 'article',
  backend: 'html5',
  safe: 'safe',
  attributes: ['showtitle!','imagesdir=/images', 'icons=font']
});

function splitMore(asciidocContent) {
  let parts = asciidocContent.split('pass::[more]');
  return {
    excerpt: parts[0],
    full: parts.join('')
  }
}

function convert (asciidocContent) {
  let parts = splitMore(asciidocContent);
  let excerpt = processor.$load(parts.excerpt, options);
  let doc = processor.$load(parts.full, options);
  let value = {
    attributes: _.pick(doc.attributes, ['smap']),
    excerpt: excerpt.$convert(),
    html: doc.$convert()
  }
  return value;
}

export function asciidocPlugin (hubpress) {

  hubpress.on('requestRenderingDocuments', (opts) => {

    const posts = (opts.data.documents.posts || []).map((post) => {
      const _post = Object.assign({}, post, convert(post.content), {
        content: post.content
      });


      let original = _.pick(_post, 'attributes', 'author', 'html', 'tags', 'content', 'name', 'path', 'sha');

      _post.title = original.title = original.attributes.smap['doctitle'] ;
      _post.image = original.image = original.attributes.smap['hp-image'] ;
      _post.tags = original.tags = original.attributes.smap['hp-tags'] && original.attributes.smap['hp-tags'].split(',') ;
      _post.url = original.url = opts.data.config.urls.getPostUrl(original.name);

      let _postToSave = Object.assign({}, _post, {original: original});
      _postToSave.original.published_at = _postToSave.published_at = original.name.split('-').slice(0,3).join('-');

      return _postToSave;
    })

    const mergeDocuments = Object.assign({}, opts.data.documents, {posts});
    const data = Object.assign({}, opts.data, {documents: mergeDocuments});
    return Object.assign({}, opts, {data});
  })

  hubpress.on('requestRenderingPost', (opts) => {

    let refreshedPost = convert(opts.data.post.content);
     //Object.assign(opts.data, {document: convertedContent});
    refreshedPost._id = opts.data.post._id;
    console.log('refreshedPost', refreshedPost);
    refreshedPost.title = refreshedPost.attributes.smap['doctitle'];
    refreshedPost.image = refreshedPost.attributes.smap['hp-image'] ;
    refreshedPost.tags = refreshedPost.attributes.smap['hp-tags'] && refreshedPost.attributes.smap['hp-tags'].split(',');
    refreshedPost.published_at = refreshedPost.attributes.smap['published_at'] || refreshedPost.published_at || moment().format('YYYY-MM-DD');
    let altTitle = refreshedPost.attributes.smap['hp-alt-title'];
    refreshedPost.name = slugify(refreshedPost.published_at + '-' + (altTitle || refreshedPost.title)) +'.adoc';
    refreshedPost.url = opts.state.application.config.urls.getPostUrl(refreshedPost.name);

    const mergedPost = Object.assign({}, opts.data.post, refreshedPost);
    const data = Object.assign({}, opts.data, {post: mergedPost});
    return Object.assign({}, opts, {data});
  })

}
