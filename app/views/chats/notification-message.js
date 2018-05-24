import Platform from 'Platform';
import React, {Component, PropTypes} from 'react';
import HTML from '../../utils/html-helper';
import StringHelper from '../../utils/string-helper';
import App from '../../core';
import replaceViews from '../replace-views';
import Button from '../../components/button';
import Lang from '../../lang';

export default class NotificationMessage extends Component {
    static propTypes = {
        className: PropTypes.string,
        message: PropTypes.object.isRequired,
        contentConverter: PropTypes.func,
    };

    static defaultProps = {
        className: null,
        contentConverter: null,
    };

    static get NotificationMessage() {
        return replaceViews('chats/notification-message', NotificationMessage);
    }

    shouldComponentUpdate(nextProps) {
        return nextProps.className !== this.props.className || nextProps.contentConverter !== this.props.contentConverter || nextProps.message !== this.props.message || nextProps.message.content !== this.props.message.content;
    }

    handleContextMenu = e => {
        if (e.target.tagName === 'A') {
            const link = e.target.href;
            if (link && (link.startsWith('http://') || link.startsWith('https://'))) {
                let linkText = document.getSelection().toString();
                if (linkText === '') {
                    linkText = e.target.innerText;
                }
                App.ui.showContextMenu({x: e.pageX, y: e.pageY}, App.ui.createLinkContextMenu(link, linkText));
                e.preventDefault();
            }
        }
    };

    render() {
        let {
            message,
            className,
            contentConverter,
            ...other
        } = this.props;

        const content = message.renderedTextContent(App.im.ui.renderChatMessageContent, App.im.ui.linkMembersInText);
        const {notification, actions} = message;

        let actionsButtons = [];
        if (notification.url) {
            actionsButtons.push(<Button btnClass="" key="primaryUrl" label={Lang.string('common.viewDetail')} icon="arrow-right-bold-circle" type="a" href={notification.url} className="text-primary" />);
        }
        if (actions) {
            actions.forEach((action, idx) => {
                actionsButtons.push(<Button btnClass="" key={idx} label={action.label || action.lable} icon={action.icon} type="a" href={action.url} className={`text-${action.type}`} />);
            });
        }

        return (<div
            {...other}
            onContextMenu={this.handleContextMenu}
            className={HTML.classes('app-message-notification layer rounded shadow-2', className)}
        >
            <div className="markdown-content" dangerouslySetInnerHTML={{__html: contentConverter ? contentConverter(content) : content}} />
            {actionsButtons && actionsButtons.length ? <nav className="actions nav gray">{actionsButtons}</nav> : null}
        </div>);
    }
}
